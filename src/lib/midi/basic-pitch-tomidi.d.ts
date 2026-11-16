// Importăm doar post-procesarea din Basic Pitch (fără TensorFlow, care stă în
// worker). Pachetul nu declară tipuri pentru calea asta — le luăm pe cele
// publicate în `types/`.
declare module '@spotify/basic-pitch/esm/toMidi' {
  export * from '@spotify/basic-pitch/types/toMidi';
}
