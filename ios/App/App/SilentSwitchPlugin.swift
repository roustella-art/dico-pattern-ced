import Foundation
import Capacitor
import AudioToolbox

/// Détecte si le switch silencieux physique est activé, pour prévenir l'utilisateur que la
/// preview (Web Audio) ne jouera pas de son dans ce cas (WKWebView respecte toujours le switch
/// silencieux, cf. AppDelegate.swift pour l'historique de cette limitation).
///
/// iOS n'expose aucune API publique pour lire l'état du switch silencieux (confidentialité).
/// Technique utilisée (non garantie à 100% par Apple, mais largement répandue, cf. bibliothèque
/// SwiftySilentMode) : jouer un son "système" qu'on fournit nous-mêmes, de durée connue (1.15s,
/// fichier `silence_probe.caf` quasi inaudible embarqué dans le bundle), et chronométrer le
/// callback de fin. En mode silencieux, ce type de son système est court-circuité par iOS et le
/// callback revient quasi instantanément ; en mode sonnerie, iOS attend la fin réelle de la
/// lecture (~1.15s). On utilise volontairement un fichier maison plutôt qu'un ID système standard
/// (ex. 1103) car la durée réelle de ces sons n'est pas documentée et peut varier selon la version
/// d'iOS, ce qui provoquait des faux positifs.
@objc(SilentSwitchPlugin)
public class SilentSwitchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SilentSwitchPlugin"
    public let jsName = "SilentSwitch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSilent", returnType: CAPPluginReturnPromise)
    ]

    private static let soundID: SystemSoundID = {
        var soundID: SystemSoundID = 0
        if let url = Bundle.main.url(forResource: "silence_probe", withExtension: "caf") {
            AudioServicesCreateSystemSoundID(url as CFURL, &soundID)
        }
        return soundID
    }()

    @objc func isSilent(_ call: CAPPluginCall) {
        guard SilentSwitchPlugin.soundID != 0 else {
            call.resolve(["isSilent": false])
            return
        }
        let start = Date()
        AudioServicesPlaySystemSoundWithCompletion(SilentSwitchPlugin.soundID) {
            let elapsed = Date().timeIntervalSince(start)
            // Le fichier dure ~1.15s en lecture réelle ; s'il revient bien avant, iOS l'a coupé.
            call.resolve(["isSilent": elapsed < 0.5])
        }
    }
}
