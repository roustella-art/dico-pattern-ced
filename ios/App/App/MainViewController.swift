import UIKit
import Capacitor

/// Capacitor ne scanne pas le runtime ObjC pour découvrir les plugins : il ne connaît que les
/// plugins "core" et ceux déclarés via npm (Package.swift). Un plugin local à l'app comme
/// SilentSwitchPlugin doit donc être enregistré manuellement ici.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SilentSwitchPlugin())
    }
}
