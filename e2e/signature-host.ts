/** Test-only host; excluded from the production application entry point and routes. */
import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { SignatureCapture } from '../src/app/shared/ui/signature-capture/signature-capture';
import { SignatureDraft } from '../src/app/shared/ui/signature-capture/signature.models';
@Component({
  selector: 'app-root',
  imports: [SignatureCapture],
  template: ` <main>
    <h1>Signatur-Komponententest</h1>
    <p>Diese Testoberfläche speichert und überträgt keine Unterschriften.</p>
    <label class="toggle"
      ><input
        type="checkbox"
        [checked]="disabled()"
        (change)="disabled.set($any($event.target).checked)"
      />Zeichenfläche deaktivieren</label
    >
    <app-signature-capture
      inputId="test-signature"
      alternativeInstructions="Wenn Zeichnen nicht möglich ist, fragen Sie die Werkstatt nach einer alternativen Freigabe."
      [disabled]="disabled()"
      (confirmed)="draft.set($event)"
      (invalidated)="draft.set(null)"
      (alternativeRequested)="alternative.set(true)"
    />
    <p role="status">
      {{ draft() ? 'Entwurf lokal übernommen, nicht gespeichert.' : 'Kein bestätigter Entwurf.' }}
    </p>
    @if (alternative()) {
      <p role="status">
        Alternative angefragt. Der weitere Freigabeprozess gehört zum aufrufenden Formular.
      </p>
    }
    <pre aria-label="Testdaten">{{ serialize() }}</pre>
    <div class="scroll-check">
      <h2>Bereich außerhalb der Zeichenfläche</h2>
      <p>Die Seite bleibt hier scrollbar.</p>
      <button type="button">Weiterer Testbereich</button>
    </div>
  </main>`,
  styles: `
    main {
      max-inline-size: 60rem;
      margin-inline: auto;
      padding: var(--page-gutter);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-block-size: 8rem;
      overflow: auto;
    }
    .toggle {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-block-size: 44px;
    }
    .toggle input {
      inline-size: 20px;
      min-block-size: 20px;
    }
    .scroll-check {
      margin-block-start: 4rem;
      min-block-size: 70vh;
    }
  `,
})
class SignatureHost {
  readonly draft = signal<SignatureDraft | null>(null);
  readonly disabled = signal(false);
  readonly alternative = signal(false);
  serialize() {
    return JSON.stringify(this.draft());
  }
}
void bootstrapApplication(SignatureHost);
