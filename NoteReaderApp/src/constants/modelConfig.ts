// ─────────────────────────────────────────────────────────────────────────────
// constants/modelConfig.ts
//
// Runtime access to model_config.json and labels.json.
// The app reads these at startup so the preprocessing always matches
// whatever the Python export notebook wrote.
// ─────────────────────────────────────────────────────────────────────────────

import modelConfigJson from '../../assets/model/model_config.json';
import labelsJson from '../../assets/model/labels.json';

export interface ModelConfig {
  model_name: string;
  tflite_file: string;
  input_size: [number, number];
  input_channels: number;
  color_order: 'RGB' | 'BGR';
  normalization: {
    method: string;
    description: string;
    scale: number;
    offset: number;
  };
  output: {
    type: string;
    num_classes: number;
  };
  confidence_threshold: number;
  consecutive_frames_required: number;
  quantization: string;
  base_architecture: string;
  pretrained_on: string;
}

export const MODEL_CONFIG: ModelConfig = modelConfigJson as ModelConfig;

// LABELS maps index (number) → denomination string ("10", "200", etc.)
// Derived from labels.json { "0": "10", "1": "20", ... }
export const LABELS: string[] = labelsJson.classes as string[];

export const NUM_CLASSES: number = labelsJson.num_classes as number;

// The confidence threshold from the config (default 0.70)
export const CONFIDENCE_THRESHOLD: number = MODEL_CONFIG.confidence_threshold;

// How many consecutive identical frames confirm a detection
export const CONSECUTIVE_FRAMES: number = MODEL_CONFIG.consecutive_frames_required;
