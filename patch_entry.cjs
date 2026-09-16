const fs = require('fs');
let code = fs.readFileSync('src/pages/ResultEntry.tsx', 'utf8');

// Add state
code = code.replace(
  /const \[candidateVotes, setCandidateVotes\] = useState<Record<string, string>>\({}\);/g,
  `const [candidateVotes, setCandidateVotes] = useState<Record<string, string>>({});\n  const [evidenceName, setEvidenceName] = useState('');\n  const [evidenceBase64, setEvidenceBase64] = useState('');`
);

// Add file handler
code = code.replace(
  /const handleSubmit = async \(e: React.FormEvent\) => {/g,
  `const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setEvidenceName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {`
);

// Add evidence to payload
code = code.replace(
  /candidateVotes: candidates.map\(c => \(\{/g,
  `evidence: evidenceBase64 ? { fileName: evidenceName, data: evidenceBase64 } : null,
        candidateVotes: candidates.map(c => ({`
);

// Update Evidence Upload section UI
code = code.replace(
  /<input id="file-upload" name="file-upload" type="file" className="sr-only" \/>/g,
  `<input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} />`
);

code = code.replace(
  /<p className="text-xs leading-5 text-slate-500 mt-1">PNG, JPG, PDF up to 10MB<\/p>/g,
  `<p className="text-xs leading-5 text-slate-500 mt-1">PNG, JPG, PDF up to 10MB</p>
              {evidenceName && <p className="mt-2 text-sm font-bold text-[#5cb85c]">Selected: {evidenceName}</p>}`
);

fs.writeFileSync('src/pages/ResultEntry.tsx', code);
