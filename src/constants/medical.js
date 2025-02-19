// constants/medical.js
const PROCEDURES = [
  {id: 'NEBULIZATION', name: 'Nebulization', category: 'Respiratory'},
  {id: 'OXYGEN_THERAPY', name: 'Oxygen Therapy', category: 'Respiratory'},
  {id: 'SUCTIONING', name: 'Suctioning', category: 'Respiratory'},
  {id: 'WOUND_DRESSING', name: 'Wound Dressing', category: 'Wound Care'},
  {id: 'PRESSURE_BANDAGING', name: 'Pressure Bandaging', category: 'Wound Care'},
  {id: 'STERILE_DRESSING', name: 'Sterile Dressing', category: 'Wound Care'},
  {id: 'PAIN_MANAGEMENT', name: 'Pain Management', category: 'Pain Control'},
  {id: 'FEVER_MANAGEMENT', name: 'Fever Management', category: 'Pain Control'},
  {id: 'IV_LINE_THERAPY', name: 'IV Lin Therapy', category: 'Fluid Management'},
  {id: 'MEDICATION_ADMINISTRATION', name: 'Medication Administration', category: 'Medication'},
  {id: 'GLUCOSE_ADMINISTRATION', name: 'Glucose Administration', category: 'Medication'},
  {id: 'CPR', name: 'CPR (Cardiopulmonary Resuscitation)', category: 'Emergency'},
  {id: 'DEFIBRILLATION', name: 'Defibrillation', category: 'Emergency'},
  {id: 'SPLINTING', name: 'Splinting', category: 'Emergency'},
  {id: 'IMMUNIZATION', name: 'Immunization', category: 'Prevention'},
  {id: 'PPE', name: 'Personal Protective Equipment (PPE)', category: 'Infection Control'}
  ];
  
  const BODY_SYSTEMS = [
    'Cardiovascular',
    'Respiratory',
    'Gastrointestinal',
    'Musculoskeletal',
    'Neurological',
    'Integumentary',
    'Genitourinary',
    'Endocrine',
    'Lymphatic',
    'ENT'
  ];
  
  module.exports = {
    PROCEDURES,
    BODY_SYSTEMS
  };