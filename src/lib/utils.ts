import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Papa from "papaparse"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadCSV(data: any[], filename: string) {
  try {
    if (!data || data.length === 0) {
      console.warn('No data available to export');
      return;
    }
    const csvString = Papa.unparse(data);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const finalFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 400);
  } catch (error) {
    console.error('Failed to export CSV:', error);
  }
}

