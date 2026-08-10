/**
 * Official master import adapters (structure only).
 *
 * Do NOT bundle MEDIS / MHLW / JLAC / PMDA redistributable files unless license is confirmed.
 * When importing, always set MedicalTerm.sourceCode from the source file — never LLM-invent codes.
 *
 * Planned sources:
 * - MHLW 診療報酬情報提供サービス: medicines / diseases / procedures / modifiers
 * - MEDIS-DC: ICD10 disease names, HOT drug codes, clinical lab masters
 * - JSLM: JLAC10 / JLAC11
 * - PMDA: generic/brand/form/strength
 *
 * Specialty packs can be added under knowledge/{specialty} without changing the pipeline:
 * knowledge/internal-medicine (current seed)
 * knowledge/dentistry | orthopedics | dermatology | psychiatry | care
 */

export type MasterImportRow = {
  canonicalName: string;
  reading?: string;
  category: string;
  sourceCode: string;
  source: 'national_master_import';
  aliases?: string[];
};

export type MasterImporter = {
  id: string;
  label: string;
  /** Returns verified rows with non-null sourceCode only */
  parse: (fileContent: string) => MasterImportRow[];
};

export const MASTER_IMPORTERS: MasterImporter[] = [
  {
    id: 'mhlw-medicine',
    label: '厚労省 医薬品マスター',
    parse: () => {
      throw new Error('Importer not configured — supply licensed master file first');
    },
  },
  {
    id: 'medis-icd10',
    label: 'MEDIS ICD10対応標準病名マスター',
    parse: () => {
      throw new Error('Importer not configured — confirm redistribution license first');
    },
  },
  {
    id: 'jlac11',
    label: 'JLAC11 臨床検査マスター',
    parse: () => {
      throw new Error('Importer not configured — confirm redistribution license first');
    },
  },
];
