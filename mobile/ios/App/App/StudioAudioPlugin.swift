import AVFoundation
import Capacitor
import MediaPlayer
import UIKit

final class StudioViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StudioAudioPlugin())
    }
}

@objc(StudioAudioPlugin)
public final class StudioAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StudioAudioPlugin"
    public let jsName = "StudioAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlayback", returnType: CAPPluginReturnPromise)
    ]

    private var playing = false
    private var commands: [(MPRemoteCommand, Any)] = []
    private var notifications: [NSObjectProtocol] = []
    private var deactivate: DispatchWorkItem?

    public override func load() {
        let center = MPRemoteCommandCenter.shared()
        register(center.playCommand) { _ in "play" }
        register(center.pauseCommand) { _ in "pause" }
        register(center.stopCommand) { _ in "stop" }
        register(center.togglePlayPauseCommand) { $0 ? "pause" : "play" }

        let notificationCenter = NotificationCenter.default
        notifications.append(notificationCenter.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { [weak self] notification in
            guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
            if type == .began {
                self?.emit("interrupt")
            } else {
                let rawOptions = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
                if AVAudioSession.InterruptionOptions(rawValue: rawOptions).contains(.shouldResume) {
                    self?.emit("resume")
                }
            }
        })
        notifications.append(notificationCenter.addObserver(
            forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main
        ) { [weak self] notification in
            if let raw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
               AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable {
                self?.emit("lost-route")
            }
        })
    }

    deinit {
        deactivate?.cancel()
        for (command, token) in commands { command.removeTarget(token) }
        for notification in notifications { NotificationCenter.default.removeObserver(notification) }
    }

    private func register(_ command: MPRemoteCommand, action: @escaping (Bool) -> String) {
        command.isEnabled = true
        let token = command.addTarget { [weak self] _ in
            DispatchQueue.main.async {
                guard let self else { return }
                self.emit(action(self.playing))
            }
            return .success
        }
        commands.append((command, token))
    }

    private func emit(_ action: String) {
        notifyListeners("transport", data: ["action": action], retainUntilConsumed: true)
    }

    @objc func prepare(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.deactivate?.cancel()
            do {
                let audio = AVAudioSession.sharedInstance()
                let options: AVAudioSession.CategoryOptions = call.getBool("mixWithOthers") == true ? [.mixWithOthers] : []
                try audio.setCategory(.playback, mode: .default, options: options)
                try audio.setActive(true)
                call.resolve()
            } catch {
                call.reject("Could not activate the iOS playback session.", nil, error)
            }
        }
    }

    @objc func setPlayback(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.deactivate?.cancel()
            let active = call.getBool("playing") ?? false
            self.playing = active
            let title = call.getString("title") ?? "BrainDAW"
            var info: [String: Any] = [
                MPMediaItemPropertyTitle: title,
                MPMediaItemPropertyArtist: "BrainDAW · NeuroScape Studio",
                MPNowPlayingInfoPropertyPlaybackRate: active ? 1.0 : 0.0,
                MPNowPlayingInfoPropertyIsLiveStream: true
            ]
            if let image = UIImage(named: "NowPlayingArtwork") {
                info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
            }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info

            if !active {
                let work = DispatchWorkItem { [weak self] in
                    guard self?.playing == false else { return }
                    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
                }
                self.deactivate = work
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.45, execute: work)
            }
            call.resolve()
        }
    }
}
