import mongoose from 'mongoose';

export async function connectToDatabase(mongoUri: string) {
  await mongoose.connect(mongoUri);
}
