#!/usr/bin/env python3
"""
Stemify Audio Processing Service
Handles: stem separation (Demucs), vocal part detection, modulation detection
"""

import sys
import os
import json
import traceback
import time

def progress(value: int, message: str = ""):
    print(json.dumps({"type": "progress", "value": value, "message": message}), flush=True)

def result(data: dict):
    print(json.dumps({"type": "result", **data}), flush=True)

def error(msg: str):
    print(json.dumps({"type": "error", "message": msg}), flush=True)

def main():
    if len(sys.argv) < 4:
        error("Usage: process.py <input_file> <output_dir> <song_id>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    song_id = sys.argv[3]

    if not os.path.exists(input_file):
        error(f"Input file not found: {input_file}")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    try:
        progress(5, "Loading audio analysis libraries...")
        
        # Try to import required libraries
        try:
            import librosa
            import numpy as np
            import soundfile as sf
            HAS_LIBROSA = True
        except ImportError:
            HAS_LIBROSA = False
            progress(5, "librosa not available, using fallback analysis")

        try:
            import demucs.separate
            HAS_DEMUCS = True
        except ImportError:
            HAS_DEMUCS = False

        progress(10, "Analyzing audio file...")
        
        # Get basic audio info
        audio_info = get_audio_info(input_file, HAS_LIBROSA)
        duration = audio_info.get("duration", 0)
        bpm = audio_info.get("bpm", 120)
        detected_key = audio_info.get("key", "Unknown")
        modulations = audio_info.get("modulations", [])

        progress(20, "Starting stem separation...")

        if HAS_DEMUCS:
            stems = run_demucs(input_file, output_dir, song_id)
            progress(70, "Stems separated successfully")
        else:
            progress(20, "Demucs not available - running lightweight separation...")
            stems = run_fallback_separation(input_file, output_dir, song_id, HAS_LIBROSA)
            progress(70, "Lightweight separation complete")

        progress(80, "Analyzing vocal parts...")
        vocal_parts = []
        if HAS_LIBROSA:
            vocals_stem = next((s for s in stems if s["type"] == "vocals"), None)
            if vocals_stem and os.path.exists(vocals_stem["filePath"]):
                vocal_parts = analyze_vocal_parts(vocals_stem["filePath"])
        
        progress(90, "Finalizing results...")

        # Get duration from stems
        if stems:
            try:
                import soundfile as sf
                first_stem = stems[0]["filePath"]
                if os.path.exists(first_stem):
                    info = sf.info(first_stem)
                    duration = info.duration
            except:
                pass

        result({
            "stems": stems,
            "duration": duration,
            "bpm": round(bpm, 1),
            "detectedKey": detected_key,
            "modulations": modulations,
            "vocalParts": vocal_parts,
        })

        progress(100, "Processing complete!")

    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        error(str(e))
        sys.exit(1)


def get_audio_info(file_path: str, has_librosa: bool) -> dict:
    """Extract BPM, key, duration, and modulations from audio"""
    result_data = {
        "duration": 0,
        "bpm": 120,
        "key": "Unknown",
        "modulations": []
    }

    if not has_librosa:
        try:
            import soundfile as sf
            info = sf.info(file_path)
            result_data["duration"] = info.duration
        except:
            pass
        return result_data

    try:
        import librosa
        import numpy as np

        y, sr = librosa.load(file_path, sr=22050, mono=True)
        result_data["duration"] = len(y) / sr

        # BPM detection
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        result_data["bpm"] = float(tempo) if hasattr(tempo, '__float__') else 120.0

        # Key detection using chroma features
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = chroma.mean(axis=1)
        
        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        dominant_note = note_names[np.argmax(chroma_mean)]
        
        # Simple major/minor detection
        major_profile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]
        minor_profile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]
        
        root_idx = np.argmax(chroma_mean)
        rotated_major = np.roll(major_profile, root_idx)
        rotated_minor = np.roll(minor_profile, root_idx)
        
        major_score = np.corrcoef(chroma_mean, rotated_major)[0, 1]
        minor_score = np.corrcoef(chroma_mean, rotated_minor)[0, 1]
        
        mode = "Major" if major_score > minor_score else "Minor"
        result_data["key"] = f"{dominant_note} {mode}"

        # Modulation detection
        modulations = detect_modulations(y, sr, chroma, note_names)
        result_data["modulations"] = modulations

    except Exception as e:
        print(f"Audio analysis warning: {e}", file=sys.stderr)

    return result_data


def detect_modulations(y, sr, chroma, note_names) -> list:
    """Detect key modulations throughout the song"""
    import numpy as np
    
    modulations = []
    
    try:
        # Split into segments and analyze each
        segment_duration = 10  # seconds
        hop_length = 512
        segment_frames = int(segment_duration * sr / hop_length)
        
        n_frames = chroma.shape[1]
        prev_key = None
        prev_time = 0
        
        for start_frame in range(0, n_frames - segment_frames, segment_frames // 2):
            end_frame = min(start_frame + segment_frames, n_frames)
            segment_chroma = chroma[:, start_frame:end_frame]
            chroma_mean = segment_chroma.mean(axis=1)
            
            # Detect key for this segment
            root_idx = int(np.argmax(chroma_mean))
            note = note_names[root_idx]
            
            major_profile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]
            minor_profile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]
            
            rotated_major = np.roll(major_profile, root_idx)
            rotated_minor = np.roll(minor_profile, root_idx)
            
            major_score = float(np.corrcoef(chroma_mean, rotated_major)[0, 1])
            minor_score = float(np.corrcoef(chroma_mean, rotated_minor)[0, 1])
            
            mode = "Major" if major_score > minor_score else "Minor"
            current_key = f"{note} {mode}"
            confidence = max(major_score, minor_score)
            
            current_time = start_frame * hop_length / sr
            
            if prev_key and current_key != prev_key and confidence > 0.5:
                modulations.append({
                    "timestamp": round(current_time, 2),
                    "fromKey": prev_key,
                    "toKey": current_key,
                    "confidence": round(confidence, 3)
                })
                prev_time = current_time
            
            prev_key = current_key
    
    except Exception as e:
        print(f"Modulation detection warning: {e}", file=sys.stderr)
    
    return modulations


def run_demucs(input_file: str, output_dir: str, song_id: str) -> list:
    """Use Demucs for professional stem separation"""
    import subprocess
    import os
    import glob
    
    # Run demucs
    cmd = [
        sys.executable, "-m", "demucs",
        "--two-stems", "vocals",  # fast: just vocals + no-vocals
        "-o", output_dir,
        input_file
    ]
    
    # Try 4-stem separation first (better quality)
    cmd_4stem = [
        sys.executable, "-m", "demucs",
        "-n", "htdemucs",
        "-o", output_dir,
        input_file
    ]
    
    try:
        progress(25, "Running 4-stem Demucs (htdemucs)...")
        subprocess.run(cmd_4stem, check=True, capture_output=True, timeout=600)
        
        # Find output files
        model_name = "htdemucs"
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        stems_path = os.path.join(output_dir, model_name, base_name)
        
        stems = []
        stem_map = {
            "vocals": ("vocals", "Vocals"),
            "bass": ("bass", "Bass"),
            "drums": ("drums", "Drums"),
            "other": ("other", "Instruments"),
        }
        
        for stem_file, (stem_type, stem_label) in stem_map.items():
            for ext in ["wav", "mp3", "flac"]:
                file_path = os.path.join(stems_path, f"{stem_file}.{ext}")
                if os.path.exists(file_path):
                    stems.append({
                        "type": stem_type,
                        "label": stem_label,
                        "filePath": file_path,
                        "fileName": f"{stem_file}.{ext}",
                        "duration": 0,
                    })
                    break
        
        if stems:
            progress(65, "Analyzing vocal harmonics for SATB detection...")
            vocal_stem = next((s for s in stems if s["type"] == "vocals"), None)
            if vocal_stem:
                satb_stems = split_vocal_parts(vocal_stem["filePath"], output_dir, song_id)
                if satb_stems:
                    stems.extend(satb_stems)
            return stems
            
    except Exception as e:
        print(f"4-stem demucs failed: {e}, trying 2-stem...", file=sys.stderr)
    
    # Fallback to 2-stem
    try:
        progress(25, "Running 2-stem Demucs...")
        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
        
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        stems_path = os.path.join(output_dir, "htdemucs_2stems", base_name)
        if not os.path.exists(stems_path):
            stems_path = os.path.join(output_dir, "mdx_extra_q", base_name)
        
        stems = []
        for stem_type in ["vocals", "no_vocals"]:
            for ext in ["wav", "mp3"]:
                file_path = os.path.join(stems_path, f"{stem_type}.{ext}")
                if os.path.exists(file_path):
                    label = "Vocals" if stem_type == "vocals" else "Instruments"
                    t = "vocals" if stem_type == "vocals" else "other"
                    stems.append({
                        "type": t,
                        "label": label,
                        "filePath": file_path,
                        "fileName": f"{stem_type}.{ext}",
                        "duration": 0,
                    })
                    break
        
        return stems
    except Exception as e:
        raise Exception(f"Demucs processing failed: {e}")


def run_fallback_separation(input_file: str, output_dir: str, song_id: str, has_librosa: bool) -> list:
    """Lightweight fallback separation when Demucs is not available"""
    import soundfile as sf
    import numpy as np
    import os
    
    stems = []
    
    try:
        if has_librosa:
            import librosa
            y, sr = librosa.load(input_file, sr=44100, mono=False)
            if y.ndim == 1:
                y = np.vstack([y, y])
        else:
            y, sr = sf.read(input_file, always_2d=True)
            y = y.T  # shape: (channels, samples)
            if y.shape[0] == 1:
                y = np.vstack([y, y])
        
        progress(30, "Separating using spectral filtering...")
        
        # Simple frequency-based separation
        # Vocals: midrange frequencies (300Hz - 3000Hz) 
        # Bass: low frequencies (20Hz - 300Hz)
        # Drums: transient detection
        # Instruments: the rest
        
        def butter_filter(data, cutoff, sr, filter_type, order=5):
            from scipy import signal
            nyq = sr / 2
            normal_cutoff = cutoff / nyq
            normal_cutoff = min(0.99, max(0.01, normal_cutoff))
            b, a = signal.butter(order, normal_cutoff, btype=filter_type, analog=False)
            return signal.filtfilt(b, a, data)
        
        try:
            from scipy import signal as scipy_signal
            HAS_SCIPY = True
        except ImportError:
            HAS_SCIPY = False
        
        # Mono mix for processing
        mono = y.mean(axis=0)
        
        if HAS_SCIPY:
            # Bass: below 300Hz
            bass_mono = butter_filter(mono, 300, sr, 'low')
            bass = np.vstack([bass_mono, bass_mono])
            
            # Vocals: 300Hz - 3000Hz bandpass
            low_cut = butter_filter(mono, 300, sr, 'high')
            vocals_mono = butter_filter(low_cut, 3000, sr, 'low')
            vocals = np.vstack([vocals_mono, vocals_mono])
            
            # Instruments: everything minus bass/vocals
            instruments_mono = mono - bass_mono * 0.8 - vocals_mono * 0.5
            instruments = np.vstack([instruments_mono, instruments_mono])
            
            stems_data = [
                ("vocals", "Vocals", vocals),
                ("bass", "Bass", bass),
                ("other", "Instruments", instruments),
            ]
        else:
            # Even simpler: just split into vocals and instruments using stereo difference
            if y.shape[0] >= 2:
                vocals_mono = y[0] - y[1]  # Center extraction (vocals usually center-panned)
                instruments_mono = (y[0] + y[1]) / 2 - vocals_mono * 0.5
                vocals = np.vstack([vocals_mono, vocals_mono])
                instruments = np.vstack([instruments_mono, instruments_mono])
                stems_data = [
                    ("vocals", "Vocals", vocals),
                    ("other", "Instruments", instruments),
                ]
            else:
                stems_data = [("other", "Full Mix", y)]
        
        # Save stems
        for stem_type, stem_label, audio in stems_data:
            progress(40 + len(stems) * 10, f"Saving {stem_label} stem...")
            out_path = os.path.join(output_dir, f"{stem_type}.wav")
            # Normalize
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                audio = audio / max_val * 0.9
            sf.write(out_path, audio.T, sr)
            stems.append({
                "type": stem_type,
                "label": stem_label,
                "filePath": out_path,
                "fileName": f"{stem_type}.wav",
                "duration": 0,
            })
        
    except Exception as e:
        print(f"Fallback separation error: {e}", file=sys.stderr)
        # Last resort: just copy original as "full mix"
        import shutil
        out_path = os.path.join(output_dir, "fullmix.wav")
        ext = os.path.splitext(input_file)[1].lower()
        out_path = os.path.join(output_dir, f"fullmix{ext}")
        shutil.copy2(input_file, out_path)
        stems.append({
            "type": "other",
            "label": "Full Mix",
            "filePath": out_path,
            "fileName": os.path.basename(out_path),
            "duration": 0,
        })
    
    return stems


def split_vocal_parts(vocals_file: str, output_dir: str, song_id: str) -> list:
    """Split vocal track into SATB (Soprano, Alto, Tenor, Baritone) parts"""
    try:
        import librosa
        import numpy as np
        import soundfile as sf
        from scipy import signal
        
        y, sr = librosa.load(vocals_file, sr=44100, mono=True)
        
        # SATB frequency ranges (Hz)
        # Soprano: C4-C6 (262-1047 Hz), optimal 392-880
        # Alto: G3-E5 (196-659 Hz), optimal 220-523
        # Tenor: C3-A4 (130-440 Hz), optimal 165-392
        # Baritone/Bass: E2-E4 (82-330 Hz), optimal 98-262
        
        def bandpass(audio, low_hz, high_hz, sr):
            nyq = sr / 2
            low = min(0.99, max(0.01, low_hz / nyq))
            high = min(0.99, max(0.01, high_hz / nyq))
            if low >= high:
                return audio
            b, a = signal.butter(4, [low, high], btype='band')
            return signal.filtfilt(b, a, audio)
        
        parts = [
            ("soprano", "Soprano", 330, 1047),
            ("alto",    "Alto",    196, 523),
            ("tenor",   "Tenor",   130, 392),
            ("baritone","Baritone",  82, 262),
        ]
        
        stems = []
        for part_type, part_label, low, high in parts:
            filtered = bandpass(y, low, high, sr)
            max_val = np.max(np.abs(filtered))
            if max_val < 0.001:  # Skip if essentially silent
                continue
            filtered = filtered / max_val * 0.85
            out_path = os.path.join(output_dir, f"{part_type}.wav")
            sf.write(out_path, filtered, sr)
            stems.append({
                "type": part_type,
                "label": part_label,
                "filePath": out_path,
                "fileName": f"{part_type}.wav",
                "duration": 0,
            })
        
        return stems
        
    except Exception as e:
        print(f"SATB splitting error: {e}", file=sys.stderr)
        return []


def analyze_vocal_parts(vocals_file: str) -> list:
    """Analyze vocal stem to identify and categorize voice parts"""
    try:
        import librosa
        import numpy as np
        
        y, sr = librosa.load(vocals_file, sr=22050, mono=True)
        
        # Extract fundamental frequency (pitch)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'),
            sr=sr
        )
        
        voiced_f0 = f0[voiced_flag & (f0 > 0)] if f0 is not None else np.array([])
        
        if len(voiced_f0) == 0:
            return []
        
        # Classify segments by SATB range
        def classify_pitch(hz):
            if hz >= 330: return "soprano"
            elif hz >= 196: return "alto"
            elif hz >= 130: return "tenor"
            else: return "baritone"
        
        vocal_parts = {}
        hop_length = 512
        
        for i, (pitch, is_voiced) in enumerate(zip(f0, voiced_flag)):
            if not is_voiced or pitch is None or pitch <= 0:
                continue
            part = classify_pitch(pitch)
            time = i * hop_length / sr
            if part not in vocal_parts:
                vocal_parts[part] = {"pitches": [], "times": []}
            vocal_parts[part]["pitches"].append(float(pitch))
            vocal_parts[part]["times"].append(float(time))
        
        results = []
        for part, data in vocal_parts.items():
            if len(data["pitches"]) < 10:
                continue
            pitches = np.array(data["pitches"])
            results.append({
                "type": part,
                "rangeMin": float(np.min(pitches)),
                "rangeMax": float(np.max(pitches)),
                "avgPitch": float(np.mean(pitches)),
                "timestamps": [
                    {"start": data["times"][i], "end": data["times"][i] + hop_length / sr}
                    for i in range(0, len(data["times"]), 5)  # Sample every 5th point
                ][:50]  # Limit to 50 timestamps
            })
        
        return results
        
    except Exception as e:
        print(f"Vocal analysis error: {e}", file=sys.stderr)
        return []


if __name__ == "__main__":
    main()
