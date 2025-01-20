// constants/medical.js
const PROCEDURES = [
    {
      id: 'ECG',
      name: 'Electrocardiogram',
      category: 'Cardiac'
    },
    {
      id: 'BLOOD_DRAW',
      name: 'Blood Sample Collection',
      category: 'Laboratory'
    },
    {
      id: 'WOUND_DRESSING',
      name: 'Wound Dressing',
      category: 'Nursing'
    },
    {
      id: 'IV_LINE',
      name: 'IV Line Insertion',
      category: 'Nursing'
    },
    {
      id: 'NEBULIZATION',
      name: 'Nebulization',
      category: 'Respiratory'
    },
    // Add more procedures as needed
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