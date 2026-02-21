'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, FileText, Loader2, Printer, X } from 'lucide-react';
import { AuthButton } from '@/components/auth/auth-button';
import { generateResume, type ResumeData } from '@/app/actions/optimize';

// ─── Resume Preview Component ────────────────────────────────────────────────

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
      title="Remove"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function ResumePreview({
  data,
  onRemoveExperience,
  onRemoveEducation,
}: {
  data: ResumeData;
  onRemoveExperience: (index: number) => void;
  onRemoveEducation: (index: number) => void;
}) {
  return (
    <div id="resume-preview" className="resume-preview">
      <h1
        contentEditable
        suppressContentEditableWarning
        className="text-2xl font-bold text-foreground outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
      >
        {data.name}
      </h1>

      {data.contacts && Object.keys(data.contacts).length > 0 && (
        <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          {data.contacts.email && (
            <span
              contentEditable
              suppressContentEditableWarning
              className="outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
            >
              {data.contacts.email}
            </span>
          )}
          {data.contacts.linkedin && (
            <span
              contentEditable
              suppressContentEditableWarning
              className="outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
            >
              {data.contacts.linkedin}
            </span>
          )}
          {data.contacts.github && (
            <span
              contentEditable
              suppressContentEditableWarning
              className="outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
            >
              {data.contacts.github}
            </span>
          )}
        </div>
      )}

      {data.summary && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
            Summary
          </h2>
          <p
            contentEditable
            suppressContentEditableWarning
            className="text-sm text-foreground leading-relaxed outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
          >
            {data.summary}
          </p>
        </section>
      )}

      {data.experience && data.experience.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
            Experience
          </h2>
          <div className="space-y-3">
            {data.experience.map((exp, i) => (
              <div key={i} className="group relative">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <RemoveButton onClick={() => onRemoveExperience(i)} />
                    <div>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        className="font-semibold text-sm text-foreground outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                      >
                        {exp.role}
                      </span>
                      <span className="text-muted-foreground text-sm"> at </span>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        className="text-sm text-foreground outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                      >
                        {exp.company}
                      </span>
                    </div>
                  </div>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    className="text-xs text-muted-foreground whitespace-nowrap outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                  >
                    {exp.period}
                  </span>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5 list-disc list-outside ml-4">
                    {exp.bullets.map((bullet, j) => (
                      <li
                        key={j}
                        contentEditable
                        suppressContentEditableWarning
                        className="text-sm text-foreground leading-snug outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills && data.skills.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
            Skills
          </h2>
          <p
            contentEditable
            suppressContentEditableWarning
            className="text-sm text-foreground outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
          >
            {data.skills.join(' \u00B7 ')}
          </p>
        </section>
      )}

      {data.education && data.education.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
            Education
          </h2>
          <div className="space-y-2">
            {data.education.map((edu, i) => (
              <div key={i} className="group flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <RemoveButton onClick={() => onRemoveEducation(i)} />
                  <div>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      className="font-semibold text-sm text-foreground outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                    >
                      {edu.degree}
                    </span>
                    <span className="text-muted-foreground text-sm"> - </span>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      className="text-sm text-foreground outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                    >
                      {edu.institution}
                    </span>
                  </div>
                </div>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="text-xs text-muted-foreground whitespace-nowrap outline-none focus:ring-1 focus:ring-ring rounded px-1 -mx-1"
                >
                  {edu.period}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Print Styles ────────────────────────────────────────────────────────────

const PRINT_STYLES = `
  @page { size: A4; margin: 15mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 11pt;
    color: #333;
    line-height: 1.4;
  }
  h1 { font-size: 18pt; font-weight: 700; margin: 0 0 2pt; color: #111; }
  .contacts { font-size: 9pt; color: #666; margin-bottom: 10pt; }
  .contacts span { margin-right: 12pt; }
  h2 {
    font-size: 10pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    color: #666;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2pt;
    margin: 10pt 0 6pt;
  }
  .summary { font-size: 10pt; line-height: 1.5; color: #333; }
  .experience-item { margin-bottom: 8pt; }
  .experience-header { display: flex; justify-content: space-between; align-items: baseline; }
  .role { font-weight: 600; font-size: 10.5pt; color: #111; }
  .company { font-size: 10.5pt; color: #333; }
  .period { font-size: 9pt; color: #666; white-space: nowrap; }
  ul { margin: 3pt 0 0 16pt; padding: 0; }
  li { font-size: 10pt; line-height: 1.45; margin-bottom: 1pt; color: #333; }
  .skills { font-size: 10pt; color: #333; }
  .education-item { display: flex; justify-content: space-between; align-items: baseline; }
  .degree { font-weight: 600; font-size: 10.5pt; color: #111; }
  .institution { font-size: 10.5pt; color: #333; }
`;

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OptimizePage() {
  const { data: session, status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated' && !!session?.user;

  const [vacancyText, setVacancyText] = useState('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumeRef = useRef<HTMLDivElement>(null);

  async function handleGenerate() {
    if (!vacancyText || vacancyText.length < 50) {
      setError('Job description must be at least 50 characters');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const result = await generateResume(vacancyText);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setResumeData(result.data);
    }

    setIsGenerating(false);
  }

  function handleRemoveExperience(index: number) {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.filter((_, i) => i !== index),
    });
  }

  function handleRemoveEducation(index: number) {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      education: resumeData.education.filter((_, i) => i !== index),
    });
  }

  function handlePrint() {
    const resumeEl = resumeRef.current?.querySelector('#resume-preview');
    if (!resumeEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const el = resumeEl as HTMLElement;

    // Build print HTML from the contentEditable DOM
    let html = `<h1>${el.querySelector('h1')?.textContent || ''}</h1>`;

    // Contacts
    const contactsEl = el.querySelector('.mt-1.text-sm');
    if (contactsEl) {
      const spans = contactsEl.querySelectorAll('span[contenteditable]');
      html += '<div class="contacts">';
      spans.forEach((s) => {
        html += `<span>${s.textContent}</span>`;
      });
      html += '</div>';
    }

    // Sections
    const sections = el.querySelectorAll('section');
    sections.forEach((section) => {
      const heading = section.querySelector('h2');
      if (!heading) return;
      const title = heading.textContent || '';
      html += `<h2>${title}</h2>`;

      if (title.toLowerCase() === 'summary') {
        const p = section.querySelector('p');
        html += `<p class="summary">${p?.textContent || ''}</p>`;
      } else if (title.toLowerCase() === 'experience') {
        const items = section.querySelectorAll(':scope > div > div');
        items.forEach((item) => {
          html += '<div class="experience-item">';
          const headerDiv = item.querySelector(':scope > div:first-child');
          const periodSpan = item.querySelector(':scope > span[contenteditable]');
          if (headerDiv) {
            const spans = headerDiv.querySelectorAll('span[contenteditable]');
            html += '<div class="experience-header"><div>';
            html += `<span class="role">${spans[0]?.textContent || ''}</span>`;
            html += ' at ';
            html += `<span class="company">${spans[1]?.textContent || ''}</span>`;
            html += '</div>';
            html += `<span class="period">${periodSpan?.textContent || ''}</span>`;
            html += '</div>';
          }
          const bullets = item.querySelectorAll('li');
          if (bullets.length > 0) {
            html += '<ul>';
            bullets.forEach((li) => {
              html += `<li>${li.textContent}</li>`;
            });
            html += '</ul>';
          }
          html += '</div>';
        });
      } else if (title.toLowerCase() === 'skills') {
        const p = section.querySelector('p');
        html += `<p class="skills">${p?.textContent || ''}</p>`;
      } else if (title.toLowerCase() === 'education') {
        const items = section.querySelectorAll(':scope > div > div');
        items.forEach((item) => {
          const spans = item.querySelectorAll('span[contenteditable]');
          html += '<div class="education-item"><div>';
          html += `<span class="degree">${spans[0]?.textContent || ''}</span>`;
          html += ' - ';
          html += `<span class="institution">${spans[1]?.textContent || ''}</span>`;
          html += '</div>';
          html += `<span class="period">${spans[2]?.textContent || ''}</span>`;
          html += '</div>';
        });
      }
    });

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resume</title><style>${PRINT_STYLES}</style></head><body>${html}</body></html>`,
    );
    printWindow.document.close();
    printWindow.print();
  }

  // Not authenticated - show login prompt
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-bold">Optimize Resume</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Sign in to optimize your resume. Your career data stored in Build CV will be used to generate a tailored resume for any job posting.
              </p>
              <AuthButton />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-bold">Optimize Resume</h1>
          </div>
          {resumeData && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste the full job description here (minimum 50 characters)..."
                  value={vacancyText}
                  onChange={(e) => setVacancyText(e.target.value)}
                  className="min-h-[300px] resize-y"
                  disabled={isGenerating}
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {vacancyText.length} characters
                  </span>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || vacancyText.length < 50}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Resume'
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Resume Preview */}
          <div ref={resumeRef}>
            {isGenerating ? (
              <Card>
                <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p className="text-sm">Analyzing job posting and generating your tailored resume...</p>
                  <p className="text-xs mt-1">This may take 30-60 seconds</p>
                </CardContent>
              </Card>
            ) : resumeData ? (
              <Card>
                <CardContent className="pt-6">
                  <ResumePreview
                    data={resumeData}
                    onRemoveExperience={handleRemoveExperience}
                    onRemoveEducation={handleRemoveEducation}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm">Paste a job description and click &quot;Generate Resume&quot;</p>
                  <p className="text-xs mt-1">Your career data will be used to create a tailored resume</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
