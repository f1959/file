import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ====== CHANGE THESE 3 VALUES ======
const SUPABASE_URL = 'REPLACE_WITH_YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_SUPABASE_ANON_KEY';
const UPLOAD_PASSWORD = 'change-this-upload-password';
// ===================================

const BUCKET = 'private-send-files';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
const CODE_TTL_MS = 24 * 60 * 60 * 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const downloadCodeInput = document.getElementById('downloadCodeInput');
const downloadBtn = document.getElementById('downloadBtn');
const downloadStatus = document.getElementById('downloadStatus');

const uploadPasswordInput = document.getElementById('uploadPasswordInput');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const generatedCode = document.getElementById('generatedCode');

function setStatus(target, message, error = false) {
  target.textContent = message;
  target.style.color = error ? '#b42318' : '#475467';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function randomCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

function cleanFileName(name) {
  return String(name || 'file.bin').replace(/[^a-zA-Z0-9._\- ()]/g, '_');
}

async function createUniqueCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('transfers')
      .select('code')
      .eq('code', code)
      .limit(1);

    if (error) throw error;
    if (!data.length) return code;
  }
  throw new Error('Could not generate code. Try again.');
}

async function uploadFile() {
  const file = fileInput.files && fileInput.files[0];
  const uploadPassword = uploadPasswordInput.value;

  if (SUPABASE_URL.includes('REPLACE_') || SUPABASE_ANON_KEY.includes('REPLACE_')) {
    setStatus(uploadStatus, 'Please edit main.js and set SUPABASE_URL + SUPABASE_ANON_KEY first.', true);
    return;
  }

  if (uploadPassword !== UPLOAD_PASSWORD) {
    setStatus(uploadStatus, 'Wrong upload password.', true);
    return;
  }

  if (!file) {
    setStatus(uploadStatus, 'Pick a file first.', true);
    return;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    setStatus(uploadStatus, 'File too big. Max is 50 MB.', true);
    return;
  }

  uploadBtn.disabled = true;
  generatedCode.textContent = '';
  setStatus(uploadStatus, 'Uploading...');

  try {
    const code = await createUniqueCode();
    const objectPath = `${crypto.randomUUID()}-${cleanFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
      .from('transfers')
      .insert({
        code,
        object_path: objectPath,
        original_name: cleanFileName(file.name),
        content_type: file.type || 'application/octet-stream',
        created_at: new Date().toISOString()
      });

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([objectPath]);
      throw insertError;
    }

    setStatus(uploadStatus, 'Upload done. Share this code:');
    generatedCode.textContent = code;
    fileInput.value = '';
  } catch (error) {
    setStatus(uploadStatus, error.message || 'Upload failed', true);
  } finally {
    uploadBtn.disabled = false;
  }
}

async function downloadWithCode() {
  const code = onlyDigits(downloadCodeInput.value);
  downloadCodeInput.value = code;

  if (SUPABASE_URL.includes('REPLACE_') || SUPABASE_ANON_KEY.includes('REPLACE_')) {
    setStatus(downloadStatus, 'Please edit main.js and set SUPABASE_URL + SUPABASE_ANON_KEY first.', true);
    return;
  }

  if (code.length !== 6) {
    setStatus(downloadStatus, 'Code must be 6 digits.', true);
    return;
  }

  downloadBtn.disabled = true;
  setStatus(downloadStatus, 'Checking code...');

  try {
    const { data: rows, error: rowError } = await supabase
      .from('transfers')
      .select('code, object_path, original_name, content_type, created_at')
      .eq('code', code)
      .limit(1);

    if (rowError) throw rowError;
    if (!rows.length) throw new Error('Code not found or already used.');

    const transfer = rows[0];
    const age = Date.now() - new Date(transfer.created_at).getTime();

    if (Number.isFinite(age) && age > CODE_TTL_MS) {
      await supabase.storage.from(BUCKET).remove([transfer.object_path]);
      await supabase.from('transfers').delete().eq('code', code);
      throw new Error('Code expired.');
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(transfer.object_path);

    if (downloadError) throw downloadError;

    await supabase.storage.from(BUCKET).remove([transfer.object_path]);
    await supabase.from('transfers').delete().eq('code', code);

    const blob = new Blob([fileData], { type: transfer.content_type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.original_name || `download-${code}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus(downloadStatus, 'Downloaded. Code is now used and deleted.');
    downloadCodeInput.value = '';
  } catch (error) {
    setStatus(downloadStatus, error.message || 'Download failed', true);
  } finally {
    downloadBtn.disabled = false;
  }
}

downloadCodeInput.addEventListener('input', () => {
  downloadCodeInput.value = onlyDigits(downloadCodeInput.value);
});

downloadBtn.addEventListener('click', downloadWithCode);
uploadBtn.addEventListener('click', uploadFile);
