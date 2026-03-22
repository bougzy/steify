import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://stemify:stemify@stemify.l9oc65x.mongodb.net/stemify'

interface GlobalMongoose {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var _mongoose: GlobalMongoose | undefined
}

let cached: GlobalMongoose = global._mongoose || { conn: null, promise: null }

if (!global._mongoose) {
  global._mongoose = cached
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    if (cached.conn.connection.readyState === 1) return cached.conn
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    const isAtlas = MONGODB_URI.includes('mongodb.net')

    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      ...(isAtlas && {
        tls: true,
        tlsAllowInvalidCertificates: false,
      }),
    }).catch((err) => {
      cached.promise = null
      throw new Error(`Database connection failed: ${err.message}`)
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB