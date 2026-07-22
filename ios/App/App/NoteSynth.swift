import AVFoundation

/// Portage natif du moteur de synthèse `pluckNote()` de audio.js (5 timbres : doux, piano,
/// guitare, nylon, electrique, epiano). Contourne le switch silencieux iOS en jouant via
/// AVAudioEngine dans le process principal de l'app, plutôt que le Web Audio API de WKWebView
/// qui tourne dans le process WebContent séparé (cf. AppDelegate.swift pour le contexte complet
/// du bug switch silencieux et sa résolution pour le clic du métronome).
///
/// Chaque note est intégralement synthétisée dans un buffer en mémoire (comme le ferait
/// l'AudioContext hors-ligne), puis jouée via un AVAudioPlayerNode. Simplification connue :
/// les bends de hauteur (freqEnd/bendDur) ne sont pas supportés pour nylon/electrique
/// (Karplus-Strong) — rarement utilisés avec ces timbres dans l'app, portage à affiner plus
/// tard si besoin.
final class NoteSynth {
    static let shared = NoteSynth()

    private let engine = AVAudioEngine()
    // Pool de lecteurs pour la polyphonie (accords / notes qui se chevauchent) — chacun est
    // indépendant, on tourne dessus en round-robin plutôt que de gérer un mixage manuel.
    private let players: [AVAudioPlayerNode] = (0..<8).map { _ in AVAudioPlayerNode() }
    private var nextPlayerIdx = 0
    private let sampleRate: Double = 44100
    private var format: AVAudioFormat!

    private init() {
        format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)
        for p in players {
            engine.attach(p)
            engine.connect(p, to: engine.mainMixerNode, format: format)
        }
        engine.prepare()
        try? engine.start()
        for p in players { p.play() } // laissés en lecture en permanence : scheduleBuffer(at:) gère le timing
    }

    private func ensureRunning() {
        if !engine.isRunning {
            try? engine.start()
            for p in players where !p.isPlaying { p.play() }
        }
    }

    /// Stoppe toutes les notes en cours ET annule celles déjà programmées dans le futur —
    /// `AVAudioPlayerNode.stop()` vide la file de buffers programmés, contrairement à un
    /// `DispatchQueue.asyncAfter` qui ne peut pas être annulé une fois lancé (bug initial :
    /// les notes continuaient de jouer après l'arrêt de la preview).
    func stopAll() {
        for p in players { p.stop() }
        for p in players { p.play() } // repart tout de suite, prêt pour la prochaine preview
    }

    /// Convertit un délai en secondes vers l'horloge hostTime attendue par AVAudioTime —
    /// permet un scheduling sample-accurate côté moteur audio, indépendant du thread principal
    /// (contrairement à asyncAfter, qui dérive sous charge et bloque la synchronisation avec le
    /// curseur de tablature).
    private func hostTime(secondsFromNow seconds: Double) -> UInt64 {
        var timebase = mach_timebase_info_data_t()
        mach_timebase_info(&timebase)
        let now = mach_absolute_time()
        let nanos = seconds * 1_000_000_000
        let ticks = nanos * Double(timebase.denom) / Double(timebase.numer)
        return now &+ UInt64(max(0, ticks))
    }

    func playNote(freq: Double, sound: String, gainMult: Double, freqEnd: Double?, bendDur: Double?, delaySeconds: Double) {
        ensureRunning()
        guard let buffer = render(freq: freq, sound: sound, gainMult: gainMult, freqEnd: freqEnd, bendDur: bendDur) else { return }
        let player = players[nextPlayerIdx]
        nextPlayerIdx = (nextPlayerIdx + 1) % players.count
        let when = AVAudioTime(hostTime: hostTime(secondsFromNow: delaySeconds))
        player.scheduleBuffer(buffer, at: when, options: [], completionHandler: nil)
    }

    // ── Utilitaires DSP ─────────────────────────────────────────────────────────

    private func freqAt(_ t: Double, freq: Double, freqEnd: Double?, bendDur: Double?) -> Double {
        guard let fe = freqEnd, let bd = bendDur, bd > 0, fe != freq else { return freq }
        if t >= bd { return fe }
        let ratio = fe / freq
        return freq * pow(ratio, t / bd)
    }

    /// Enveloppe : montée linéaire de v0 à v1 sur [t0,t1], puis descente exponentielle de v1 à
    /// vFloor sur [t1,t2] — reproduit le pattern `linearRampToValueAtTime` + `exponentialRampToValueAtTime`
    /// utilisé partout dans pluckNote().
    private func envelopeAt(_ t: Double, v0: Double, t0: Double, v1: Double, t1: Double, vFloor: Double, t2: Double) -> Double {
        if t <= t0 { return v0 }
        if t < t1 { return v0 + (v1 - v0) * (t - t0) / (t1 - t0) }
        if t >= t2 { return vFloor }
        let ratio = vFloor / v1
        return v1 * pow(ratio, (t - t1) / (t2 - t1))
    }

    private func triangle(_ phase: Double) -> Double {
        var x = phase / (2 * Double.pi)
        x -= floor(x)
        return x < 0.5 ? (4 * x - 1) : (3 - 4 * x)
    }

    private func sawtooth(_ phase: Double) -> Double {
        var x = phase / (2 * Double.pi)
        x -= floor(x)
        return 2 * x - 1
    }

    private struct Biquad {
        var b0: Double = 1, b1: Double = 0, b2: Double = 0, a1: Double = 0, a2: Double = 0
        var z1: Double = 0, z2: Double = 0

        mutating func setLowpass(freq: Double, q: Double, sampleRate: Double) {
            let f = min(max(freq, 20), sampleRate * 0.49)
            let w0 = 2 * Double.pi * f / sampleRate
            let alpha = sin(w0) / (2 * q)
            let cosw0 = cos(w0)
            let b0v = (1 - cosw0) / 2, b1v = 1 - cosw0, b2v = (1 - cosw0) / 2
            let a0 = 1 + alpha, a1v = -2 * cosw0, a2v = 1 - alpha
            b0 = b0v / a0; b1 = b1v / a0; b2 = b2v / a0; a1 = a1v / a0; a2 = a2v / a0
        }

        mutating func setPeaking(freq: Double, q: Double, gainDB: Double, sampleRate: Double) {
            let f = min(max(freq, 20), sampleRate * 0.49)
            let A = pow(10, gainDB / 40)
            let w0 = 2 * Double.pi * f / sampleRate
            let alpha = sin(w0) / (2 * q)
            let cosw0 = cos(w0)
            let b0v = 1 + alpha * A, b1v = -2 * cosw0, b2v = 1 - alpha * A
            let a0 = 1 + alpha / A, a1v = -2 * cosw0, a2v = 1 - alpha / A
            b0 = b0v / a0; b1 = b1v / a0; b2 = b2v / a0; a1 = a1v / a0; a2 = a2v / a0
        }

        mutating func process(_ x: Double) -> Double {
            let y = b0 * x + z1
            z1 = b1 * x + z2 - a1 * y
            z2 = b2 * x - a2 * y
            return y
        }
    }

    // ── Rendu par timbre ─────────────────────────────────────────────────────────

    private func render(freq: Double, sound: String, gainMult: Double, freqEnd: Double?, bendDur: Double?) -> AVAudioPCMBuffer? {
        let dur: Double
        switch sound {
        case "piano": dur = 1.8
        case "guitare": dur = 1.0
        case "nylon": dur = 0.68
        case "electrique": dur = 0.88
        case "epiano": dur = 1.55
        default: dur = 0.95 // doux
        }
        let frameCount = AVAudioFrameCount(dur * sampleRate)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
        buffer.frameLength = frameCount
        guard let data = buffer.floatChannelData?[0] else { return nil }
        let n = Int(frameCount)
        for i in 0..<n { data[i] = 0 }

        switch sound {
        case "piano": renderPiano(data: data, n: n, freq: freq, gainMult: gainMult, freqEnd: freqEnd, bendDur: bendDur)
        case "guitare": renderGuitare(data: data, n: n, freq: freq, gainMult: gainMult, freqEnd: freqEnd, bendDur: bendDur)
        case "nylon": renderKarplus(data: data, n: n, freq: freq, gainMult: gainMult, isElec: false)
        case "electrique": renderKarplus(data: data, n: n, freq: freq, gainMult: gainMult, isElec: true)
        case "epiano": renderEpiano(data: data, n: n, freq: freq, gainMult: gainMult, freqEnd: freqEnd, bendDur: bendDur)
        default: renderDoux(data: data, n: n, freq: freq, gainMult: gainMult, freqEnd: freqEnd, bendDur: bendDur)
        }
        return buffer
    }

    private func renderDoux(data: UnsafeMutablePointer<Float>, n: Int, freq: Double, gainMult: Double, freqEnd: Double?, bendDur: Double?) {
        var filt = Biquad()
        filt.setLowpass(freq: min(freq * 9, 7000), q: 0.8, sampleRate: sampleRate)
        var phase1 = 0.0, phase2 = 0.0
        for i in 0..<n {
            let t = Double(i) / sampleRate
            let f = freqAt(t, freq: freq, freqEnd: freqEnd, bendDur: bendDur)
            phase1 += 2 * Double.pi * f / sampleRate
            phase2 += 2 * Double.pi * (f * 2) / sampleRate
            let raw = triangle(phase1) + sin(phase2) // o1 triangle + o2 sine octave
            let env = envelopeAt(t, v0: 0.001, t0: 0, v1: 0.32 * gainMult, t1: 0.004, vFloor: 0.001, t2: 0.9)
            data[i] = Float(filt.process(raw) * env)
        }
    }

    private func renderPiano(data: UnsafeMutablePointer<Float>, n: Int, freq: Double, gainMult: Double, freqEnd: Double?, bendDur: Double?) {
        struct H { let mult: Double, g: Double, dec: Double }
        let harmonics = [
            H(mult: 1, g: 0.50, dec: 1.6),
            H(mult: 2, g: 0.30, dec: 1.1),
            H(mult: 3, g: 0.16, dec: 0.75),
            H(mult: 4, g: 0.09, dec: 0.5),
            H(mult: 5.7, g: 0.04, dec: 0.3),
        ]
        var filt = Biquad()
        filt.setLowpass(freq: min(freq * 9, 6500), q: 0.4, sampleRate: sampleRate)
        var phases = [Double](repeating: 0, count: harmonics.count)
        for i in 0..<n {
            let t = Double(i) / sampleRate
            var raw = 0.0
            for (hi, h) in harmonics.enumerated() {
                let f = freqAt(t, freq: freq * h.mult, freqEnd: freqEnd.map { $0 * h.mult }, bendDur: bendDur)
                phases[hi] += 2 * Double.pi * f / sampleRate
                let g = envelopeAt(t, v0: 0.0001, t0: 0, v1: h.g * gainMult, t1: 0.003, vFloor: 0.0001, t2: h.dec)
                raw += sin(phases[hi]) * g
            }
            data[i] = Float(filt.process(raw))
        }
    }

    private func renderGuitare(data: UnsafeMutablePointer<Float>, n: Int, freq: Double, gainMult: Double, freqEnd: Double?, bendDur: Double?) {
        var lp = Biquad()
        lp.setLowpass(freq: min(freq * 5, 4000), q: 1.2, sampleRate: sampleRate)
        var filt = Biquad()
        filt.setLowpass(freq: 3500, q: 0.5, sampleRate: sampleRate)
        var phase = 0.0
        for i in 0..<n {
            let t = Double(i) / sampleRate
            let f = freqAt(t, freq: freq, freqEnd: freqEnd, bendDur: bendDur)
            phase += 2 * Double.pi * f / sampleRate
            let raw = lp.process(sawtooth(phase))
            let env = envelopeAt(t, v0: 0.0001, t0: 0, v1: 0.35 * gainMult, t1: 0.004, vFloor: 0.001, t2: 0.9)
            data[i] = Float(filt.process(raw) * env)
        }
    }

    private func renderKarplus(data: UnsafeMutablePointer<Float>, n: Int, freq: Double, gainMult: Double, isElec: Bool) {
        let N = max(2, Int((sampleRate / freq).rounded()))
        var ring = [Double](repeating: 0, count: N)
        for i in 0..<N { ring[i] = Double.random(in: -1...1) }
        if !isElec {
            for i in 1..<N { ring[i] = (ring[i] + ring[i - 1]) * 0.5 }
        }
        let damp = isElec ? 0.9955 : 0.991
        var raw = [Double](repeating: 0, count: n)
        var idx = 0
        for i in 0..<n {
            raw[i] = ring[idx]
            let next = (idx + 1) % N
            ring[idx] = (ring[idx] + ring[next]) * 0.5 * damp
            idx = next
        }

        var filt = Biquad()
        var bp = Biquad()
        if isElec {
            bp.setPeaking(freq: 750, q: 1.1, gainDB: 3.5, sampleRate: sampleRate)
            filt.setLowpass(freq: 4800, q: 0.4, sampleRate: sampleRate)
        } else {
            filt.setLowpass(freq: min(freq * 6, 3200), q: 0.3, sampleRate: sampleRate)
        }

        let dur = isElec ? 0.85 : 0.65
        let peakGain = (isElec ? 0.5 : 0.6) * gainMult
        for i in 0..<n {
            let t = Double(i) / sampleRate
            var x = raw[i]
            if isElec { x = bp.process(x) }
            let filtered = filt.process(x)
            let env: Double
            if t < 0.002 { env = peakGain * t / 0.002 }
            else if t < dur * 0.35 { env = peakGain }
            else if t >= dur { env = 0.0001 }
            else {
                let ratio = 0.0001 / peakGain
                env = peakGain * pow(ratio, (t - dur * 0.35) / (dur - dur * 0.35))
            }
            data[i] = Float(filtered * env)
        }
    }

    private func renderEpiano(data: UnsafeMutablePointer<Float>, n: Int, freq: Double, gainMult: Double, freqEnd: Double?, bendDur: Double?) {
        var filt = Biquad()
        filt.setLowpass(freq: min(freq * 10, 7500), q: 0.3, sampleRate: sampleRate)
        var carPhase = 0.0, modPhase = 0.0, octPhase = 0.0
        let modFreq = freq * 14 // le modulateur ne suit pas le bend, comme en JS (mod.frequency.value fixe)
        for i in 0..<n {
            let t = Double(i) / sampleRate
            let carFreq = freqAt(t, freq: freq, freqEnd: freqEnd, bendDur: bendDur)
            let modGain = t >= 0.18
                ? freq * 0.02
                : (freq * 3.5) * pow((freq * 0.02) / (freq * 3.5), t / 0.18)
            modPhase += 2 * Double.pi * modFreq / sampleRate
            let modSignal = sin(modPhase) * modGain
            carPhase += 2 * Double.pi * (carFreq + modSignal) / sampleRate
            octPhase += 2 * Double.pi * (freq * 2) / sampleRate

            let octGain = t >= 0.7 ? 0.0001 : (0.09 * gainMult) * pow(0.0001 / (0.09 * gainMult), t / 0.7)
            let raw = sin(carPhase) + sin(octPhase) * octGain
            let env = envelopeAt(t, v0: 0.0001, t0: 0, v1: 0.42 * gainMult, t1: 0.003, vFloor: 0.0001, t2: 1.4)
            data[i] = Float(filt.process(raw) * env)
        }
    }
}
