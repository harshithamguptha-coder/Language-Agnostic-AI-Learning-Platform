const FileUpload = ({
  onFileChange,
  selectedFile,
  theme = 'dark',
  title = 'Upload Document, Scan, or Notes',
  hint = 'PDF, DOCX, PPTX, TXT, PNG, JPG, WEBP, TIFF',
  accept = '.pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.bmp,.webp,.tif,.tiff',
}) => {
  const isDark = theme === 'dark'

  return (
    <label
      className={`flex cursor-pointer items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition ${
        isDark
          ? 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:text-white'
          : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-950'
      }`}
    >
      <div>
        <div className={`mb-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-950'}`}>
          {selectedFile ? selectedFile.name : title}
        </div>
        <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {hint}
        </div>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </div>
    </label>
  )
}

export default FileUpload
