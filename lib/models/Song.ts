import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IStem {
  type: 'vocals' | 'bass' | 'drums' | 'other' | 'soprano' | 'alto' | 'tenor' | 'baritone'
  label: string
  filePath: string
  fileName: string
  duration: number
  color: string
}

export interface IModulation {
  timestamp: number
  fromKey: string
  toKey: string
  confidence: number
}

export interface IVocalPart {
  type: string
  rangeMin: number
  rangeMax: number
  avgPitch: number
  timestamps: Array<{ start: number; end: number }>
}

export interface ISong extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  artist: string
  album: string
  duration: number
  originalFileName: string
  originalFilePath: string
  uploadedAt: Date
  processedAt?: Date
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  processingProgress: number
  errorMessage?: string
  stems: IStem[]
  modulations: IModulation[]
  vocalParts: IVocalPart[]
  detectedKey: string
  bpm: number
  coverArt?: string
  fileSize: number
  mimeType: string
}

const StemSchema = new Schema<IStem>({
  type: { type: String, required: true },
  label: { type: String, required: true },
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  duration: { type: Number, default: 0 },
  color: { type: String, required: true },
})

const ModulationSchema = new Schema<IModulation>({
  timestamp: { type: Number, required: true },
  fromKey: { type: String, required: true },
  toKey: { type: String, required: true },
  confidence: { type: Number, required: true },
})

const VocalPartSchema = new Schema<IVocalPart>({
  type: { type: String, required: true },
  rangeMin: { type: Number, required: true },
  rangeMax: { type: Number, required: true },
  avgPitch: { type: Number, required: true },
  timestamps: [{ start: Number, end: Number }],
})

const SongSchema = new Schema<ISong>(
  {
    title: { type: String, required: true },
    artist: { type: String, default: 'Unknown Artist' },
    album: { type: String, default: 'Unknown Album' },
    duration: { type: Number, default: 0 },
    originalFileName: { type: String, required: true },
    originalFilePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'completed', 'failed'],
      default: 'uploaded',
    },
    processingProgress: { type: Number, default: 0 },
    errorMessage: { type: String },
    stems: [StemSchema],
    modulations: [ModulationSchema],
    vocalParts: [VocalPartSchema],
    detectedKey: { type: String, default: 'Unknown' },
    bpm: { type: Number, default: 0 },
    coverArt: { type: String },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'audio/mpeg' },
  },
  { timestamps: true }
)

const Song: Model<ISong> =
  mongoose.models.Song || mongoose.model<ISong>('Song', SongSchema)

export default Song
