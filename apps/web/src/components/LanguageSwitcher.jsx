import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromoo' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <select
        value={i18n.language}
        onChange={handleChange}
        className="text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none cursor-pointer"
      >
        {languages.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
