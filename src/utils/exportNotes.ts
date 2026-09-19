import { NoteItem, SubjectType } from '../types/notes';
import { UserProfile } from '../services/supabase';

const SUBJECT_NAMES: Record<SubjectType, string> = {
  all: 'Všechny předměty',
  maths: 'Matematika',
  czech: 'Český jazyk',
  history: 'Dějepis',
  science: 'Přírodní vědy',
};

/**
 * Creates a clean slug for markdown anchors
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Compiles all notes of a user into a single well-structured Markdown document.
 */
export function generateAllNotesMarkdown(
  notes: NoteItem[],
  profile?: UserProfile | null,
  userEmail?: string
): string {
  const exportDate = new Date().toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const studentName = profile?.full_name || 'Student Flexnote';
  const username = profile?.username ? `@${profile.username}` : '';
  const schoolInfo = [profile?.school, profile?.grade].filter(Boolean).join(' • ');

  let md = '';

  // Title & Metadata
  md += `# 📚 Flexnote — Moje studijní zápisky\n\n`;
  md += `> **Datum exportu:** ${exportDate}\n`;
  md += `> **Student:** ${studentName} ${username ? `(${username})` : ''}\n`;
  if (schoolInfo) {
    md += `> **Škola:** ${schoolInfo}\n`;
  }
  if (userEmail) {
    md += `> **E-mail:** ${userEmail}\n`;
  }
  md += `> **Celkem zápisků:** ${notes.length}\n\n`;
  md += `---\n\n`;

  // Table of Contents
  md += `## 📑 Obsah zápisků\n\n`;

  const subjectsOrder: SubjectType[] = ['maths', 'czech', 'history', 'science'];
  const notesBySubject: Record<string, NoteItem[]> = {};

  for (const s of subjectsOrder) {
    notesBySubject[s] = [];
  }
  notesBySubject['other'] = [];

  for (const note of notes) {
    if (notesBySubject[note.subject]) {
      notesBySubject[note.subject].push(note);
    } else {
      notesBySubject['other'].push(note);
    }
  }

  let index = 1;
  for (const subj of subjectsOrder) {
    const list = notesBySubject[subj];
    if (list && list.length > 0) {
      const subjName = SUBJECT_NAMES[subj] || subj;
      md += `### ${subjName} (${list.length})\n`;
      for (const note of list) {
        const anchor = slugify(`${subjName}-${note.title}-${note.id}`);
        md += `${index++}. [${note.title}](#${anchor}) — *${note.date}*\n`;
      }
      md += `\n`;
    }
  }

  const otherList = notesBySubject['other'];
  if (otherList && otherList.length > 0) {
    md += `### Ostatní (${otherList.length})\n`;
    for (const note of otherList) {
      const anchor = slugify(`ostatni-${note.title}-${note.id}`);
      md += `${index++}. [${note.title}](#${anchor}) — *${note.date}*\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;

  // Notes content grouped by subject
  for (const subj of subjectsOrder) {
    const list = notesBySubject[subj];
    if (list && list.length > 0) {
      const subjName = SUBJECT_NAMES[subj] || subj;
      md += `## 📘 ${subjName}\n\n`;

      for (const note of list) {
        const anchor = slugify(`${subjName}-${note.title}-${note.id}`);
        md += `<a id="${anchor}"></a>\n\n`;
        md += `### ${note.title}\n\n`;
        md += `* **Předmět:** ${subjName}\n`;
        md += `* **Datum:** ${note.date}\n`;
        md += `* **Čas čtení:** ${note.readingTime || '2 min'}\n`;
        if (note.tags && note.tags.length > 0) {
          md += `* **Štítky:** ${note.tags.map((t) => `#${t}`).join(' ')}\n`;
        }
        md += `\n`;

        if (note.summary) {
          md += `> **💡 Shrnutí:**\n`;
          md += `> ${note.summary.split('\n').join('\n> ')}\n\n`;
        }

        md += `${note.markdown.trim()}\n\n`;
        md += `---\n\n`;
      }
    }
  }

  // Footer
  md += `*Vygenerováno aplikací [Flexnote](https://flexnote.oliverseidl.dev) — Digitální sešit s AI a KaTeX vzorci.*\n`;

  return md;
}

/**
 * Initiates native client-side file download with UTF-8 BOM for maximum compatibility
 */
export function downloadMarkdownFile(content: string, filename?: string): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `flexnote_zapisky_${dateStr}.md`;

  // Add UTF-8 Byte Order Mark so Windows Notepad/Office correctly opens accents
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Prepares a mailto link fallback for sending notes via email client
 */
export function createMailtoExportUrl(
  recipientEmail: string,
  userName: string,
  notesCount: number,
  markdown: string
): string {
  const subject = encodeURIComponent(`Flexnote: Export tvých zápisků (${notesCount} zápisků)`);
  
  // Truncate preview if markdown is huge for mailto URL safety
  const preview = markdown.length > 1800 
    ? markdown.slice(0, 1800) + '\n\n... (pokračování v souboru zápisků)'
    : markdown;

  const body = encodeURIComponent(
    `Ahoj ${userName},\n\nzde je tvůj export studijních zápisků z Flexnote (${notesCount} zápisků):\n\n` +
    preview +
    `\n\n---\nVygenerováno v aplikaci Flexnote (https://flexnote.oliverseidl.dev)`
  );

  return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
}
