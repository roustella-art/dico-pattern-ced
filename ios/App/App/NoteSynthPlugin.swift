import Foundation
import Capacitor

/// Pont JS ↔ natif pour NoteSynth (portage Swift de pluckNote() dans audio.js).
/// Plugin Capacitor local à l'app (pas dans node_modules) — pas de risque d'écrasement par
/// npm install, contrairement au patch appliqué sur @capacitor-community/native-audio.
@objc(NoteSynthPlugin)
public class NoteSynthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NoteSynthPlugin"
    public let jsName = "NoteSynth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "playNote", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopAll", returnType: CAPPluginReturnPromise),
    ]

    @objc func playNote(_ call: CAPPluginCall) {
        guard let freq = call.getDouble("freq"), freq > 0 else {
            call.reject("freq manquant ou invalide")
            return
        }
        let sound = call.getString("sound") ?? "doux"
        let gainMult = call.getDouble("gainMult") ?? 1.0
        let freqEnd = call.getDouble("freqEnd")
        let bendDur = call.getDouble("bendDur")
        let delaySeconds = call.getDouble("delaySeconds") ?? 0

        NoteSynth.shared.playNote(freq: freq, sound: sound, gainMult: gainMult, freqEnd: freqEnd, bendDur: bendDur, delaySeconds: delaySeconds)
        call.resolve()
    }

    @objc func stopAll(_ call: CAPPluginCall) {
        NoteSynth.shared.stopAll()
        call.resolve()
    }
}
