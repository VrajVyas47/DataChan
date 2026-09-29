// Re-export DatabaseCore to preserve modularity while deprecating organic brain
export { createDatabaseCore as createParticleBrain } from './DatabaseCore';
export type { DatabaseParticleData as BrainParticleData } from './DatabaseCore';
