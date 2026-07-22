import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // ── Session audio ────────────────────────────────────────────────────────
        // Objectif : le métronome ET la preview de tablature doivent sonner même quand
        // le switch silencieux physique est activé (comportement attendu d'une app de
        // pratique musicale). La catégorie .playback ignore le switch silencieux.
        //
        // Problème : AVAudioSession est un singleton partagé. Après notre configuration,
        // d'autres acteurs la modifient et cassent le comportement :
        //   • le plugin native-audio appelle setActive(false) à son chargement ;
        //   • WKWebView (WebKit) reconfigure la catégorie dès qu'un AudioContext Web Audio
        //     démarre, vers un mode qui respecte le switch silencieux.
        // Comme « le dernier qui écrit gagne », on ré-impose .playback + active à chaque
        // changement de route/catégorie et à chaque retour au premier plan : notre
        // configuration finit donc toujours par l'emporter au moment où le son joue.
        configureAudioSession()

        // ── TEST DIAGNOSTIC TEMPORAIRE ──────────────────────────────────────────
        // Joue un son 100% natif 3s après le lancement, sans passer par Capacitor/JS/WKWebView.
        // But : isoler si le blocage vient de notre code (WebView/plugin) ou du device/iOS lui-même.
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            self.playDiagnosticTestSound()
        }

        let nc = NotificationCenter.default
        nc.addObserver(self,
                       selector: #selector(handleRouteChange(_:)),
                       name: AVAudioSession.routeChangeNotification,
                       object: nil)
        nc.addObserver(self,
                       selector: #selector(handleInterruption(_:)),
                       name: AVAudioSession.interruptionNotification,
                       object: nil)
        return true
    }

    var diagnosticPlayer: AVAudioPlayer?
    /// Test isolé : joue click.wav via un AVAudioPlayer natif flambant neuf, en réaffirmant
    /// la session juste avant. Si ça ne joue pas avec le switch silencieux activé, le blocage
    /// est au niveau iOS/device (Focus, restriction...), pas dans notre code Capacitor.
    private func playDiagnosticTestSound() {
        guard let path = Bundle.main.path(forResource: "public/assets/audio/click", ofType: "wav") else {
            print("DIAGNOSTIC: fichier click.wav introuvable dans le bundle")
            return
        }
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            print("DIAGNOSTIC: échec config session: \(error)")
        }
        do {
            let player = try AVAudioPlayer(contentsOf: URL(fileURLWithPath: path))
            self.diagnosticPlayer = player
            player.prepareToPlay()
            let ok = player.play()
            print("DIAGNOSTIC: player.play() a retourné \(ok), catégorie=\(session.category.rawValue), active=\(session.isOtherAudioPlaying)")
        } catch {
            print("DIAGNOSTIC: échec création AVAudioPlayer: \(error)")
        }
    }

    /// Force la session en .playback + active. Idempotent : ne réécrit la catégorie que
    /// si elle a été changée, pour éviter de se battre inutilement avec soi-même.
    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            if session.category != .playback {
                try session.setCategory(.playback, mode: .default, options: [])
            }
            try session.setActive(true)
        } catch {
            print("Impossible de configurer AVAudioSession: \(error)")
        }
    }

    /// WebKit (ou le plugin) a changé la catégorie/route → on ré-impose .playback + active.
    @objc private func handleRouteChange(_ notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            configureAudioSession()
            return
        }
        // .categoryChange = quelqu'un a changé la catégorie (typiquement WebKit au démarrage
        // d'un AudioContext) ; .override / .routeConfigurationChange = autres reconfigurations.
        switch reason {
        case .categoryChange, .override, .routeConfigurationChange, .newDeviceAvailable, .oldDeviceUnavailable:
            configureAudioSession()
        default:
            break
        }
    }

    /// Fin d'interruption (appel téléphonique, etc.) → on réactive la session.
    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        if type == .ended {
            configureAudioSession()
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Le plugin native-audio a pu désactiver la session pendant le chargement ;
        // on la réactive systématiquement au retour au premier plan.
        configureAudioSession()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
