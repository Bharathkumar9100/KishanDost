export type Language = 'en' | 'hi' | 'te' | 'ta';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ScanResult {
  cropName: string;
  diseaseName: string;
  confidence: number;
  isHealthy: boolean;
  description: string;
  symptoms: string[];
  organicTreatment: string[];
  chemicalTreatment: {
    name: string;
    dosage: string;
  };
  preventionTips: string[];
  careTips?: string[];
  unclearImage?: boolean;
}

export interface ScanHistoryItem {
  id: number;
  crop_name: string;
  disease_name: string;
  result_json: ScanResult;
  image_url: string;
  created_at: string;
}
