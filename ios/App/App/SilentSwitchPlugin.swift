import Foundation
import Capacitor
import AudioToolbox

/// Détecte si le switch silencieux physique est activé, pour prévenir l'utilisateur que la
/// preview (Web Audio) ne jouera pas de son dans ce cas (WKWebView respecte toujours le switch
/// silencieux, cf. AppDelegate.swift pour l'historique de cette limitation).
///
/// iOS n'expose aucune API publique pour lire l'état du switch silencieux (confidentialité).
/// Technique utilisée (non garantie à 100% par Apple, mais largement répandue) : jouer un son
/// système très court et chronométrer le callback de fin — en mode silencieux, ce type de son
/// est court-circuité et le callback revient quasi instantanément ; en mode sonnerie, il attend
/// la fin réelle du son.
@objc(SilentSwitchPlugin)
public class SilentSwitchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SilentSwitchPlugin"
    public let jsName = "SilentSwitch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSilent", returnType: CAPPluginReturnPromise)
    ]

    @objc func isSilent(_ call: CAPPluginCall) {
        let start = Date()
        // 1103 : "tock" système très court (~0.3s en mode sonnerie), un des IDs standards utilisés
        // pour cette détection.
        AudioServicesPlaySystemSoundWithCompletion(1103) {
            let elapsed = Date().timeIntervalSince(start)
            call.resolve(["isSilent": elapsed < 0.1])
        }
    }
}
