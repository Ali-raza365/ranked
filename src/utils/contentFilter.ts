const INAPPROPRIATE_WORDS = [
  /\bf[\W_]*u[\W_]*c[\W_]*k\b/i,
  /\bs[\W_]*h[\W_]*i[\W_]*t\b/i,
  /\bb[\W_]*i[\W_]*t[\W_]*c[\W_]*h\b/i,
  /\ba[\W_]*s[\W_]*s\b/i,
  /\bd[\W_]*a[\W_]*m[\W_]*n\b/i,
  /\bb[\W_]*a[\W_]*s[\W_]*t[\W_]*a[\W_]*r[\W_]*d\b/i,
  /\bd[\W_]*i[\W_]*c[\W_]*k\b/i,
  /\bp[\W_]*i[\W_]*s[\W_]*s\b/i,
  /\bc[\W_]*u[\W_]*n[\W_]*t\b/i,
  /\bp[\W_]*r[\W_]*i[\W_]*c[\W_]*k\b/i,
  /\bw[\W_]*a[\W_]*n[\W_]*k[\W_]*e[\W_]*r\b/i,
  /\bs[\W_]*l[\W_]*u[\W_]*t\b/i,
  /\bw[\W_]*h[\W_]*o[\W_]*r[\W_]*e\b/i,
  /\bf[\W_]*a[\W_]*g\b/i,
  /\bf[\W_]*a[\W_]*g[\W_]*g[\W_]*o[\W_]*t\b/i,
  /\bn[\W_]*i[\W_]*g[\W_]*g[\W_]*a\b/i,
  /\bn[\W_]*i[\W_]*g[\W_]*e[\W_]*r\b/i,
  /\bh[\W_]*o[\W_]*e\b/i,
  /\bc[\W_]*o[\W_]*c[\W_]*k\b/i,
  /\bp[\W_]*u[\W_]*s[\W_]*s[\W_]*y\b/i
];

export const filterContent = (content: string, badWordsMode: boolean = true): boolean => {
  if (badWordsMode) return true; 
  
  return !INAPPROPRIATE_WORDS.some(pattern => pattern.test(content));
};
