import { Component } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusBadge } from '../../shared/ui/status-badge';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatusBadge, PageHeader],
  template: `
    <app-page-header
      eyebrow="A place for good work"
      heading="Your workshop, in harmony."
      description="Welcome to Artelier. A calm, connected home for your customers, instruments, and the work you love."
    />
    <section class="metrics" aria-label="Workshop overview" aria-describedby="metrics-note">
      @for (metric of metrics; track metric.title) {
        <article class="panel metric">
          <app-status-badge [tone]="metric.tone">{{ metric.label }}</app-status-badge>
          <h2>{{ metric.title }}</h2>
          <p class="metric-value" aria-label="Not available">—</p>
          <p class="metric-description">{{ metric.description }}</p>
        </article>
      }
    </section>
    <p id="metrics-note" class="note">
      Live workshop figures will appear once repair data is connected.
    </p>
    <section class="welcome" aria-labelledby="welcome-title">
      <div>
        <span class="eyebrow">The next chapter</span>
        <h2 id="welcome-title">Room for your craft.</h2>
        <p>
          Your workspace is taking shape. Start exploring the spaces that will bring your workshop
          together.
        </p>
      </div>
      <span class="art" aria-hidden="true">♮</span>
    </section>
    <section class="areas" aria-label="Explore your workspace">
      @for (area of areas; track area.path) {
        <a class="panel" [routerLink]="area.path"
          ><span class="eyebrow">{{ area.number }} / WORKSPACE</span>
          <h2>{{ area.title }} <span aria-hidden="true">↗</span></h2>
          <p>{{ area.description }}</p>
          <span class="link-label">Explore {{ area.title.toLowerCase() }} →</span></a
        >
      }
    </section>
    <p class="note">
      A fresh beginning. Your records will find a home here as each workspace becomes available.
    </p>
  `,
  styles: `
    .metrics {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
      margin-top: var(--space-6);
    }
    .metric {
      padding: var(--space-5);
    }
    .metric h2 {
      margin: var(--space-4) 0 var(--space-2);
      font-size: var(--text-sm);
    }
    .metric-value {
      font-family: var(--font-heading);
      font-size: 2rem;
      margin: 0;
    }
    .metric-description {
      color: var(--color-text-muted);
      font-size: var(--text-xs);
      margin-bottom: 0;
    }
    @media (min-width: 600px) {
      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 1200px) {
      .metrics {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    .welcome {
      margin-top: 36px;
      padding: 36px;
      background: var(--color-surface-muted);
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      gap: 24px;
    }
    .welcome h2 {
      font-family: var(--font-heading);
      font-size: 30px;
      font-weight: 400;
      margin: 18px 0 12px;
    }
    .welcome p {
      font-size: 14px;
      color: var(--color-text-muted);
      max-width: 440px;
      margin-bottom: 0;
    }
    .art {
      font-family: var(--font-heading);
      font-size: 150px;
      line-height: 1;
      color: var(--color-accent-text);
      transform: rotate(12deg);
      padding: 0 25px;
    }
    .areas {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 28px;
    }
    .panel {
      text-decoration: none;
      transition: border-color 0.15s;
      padding: 24px;
    }
    .panel:hover {
      border-color: var(--color-accent-text);
    }
    .panel h2 {
      margin: 28px 0 12px;
      display: flex;
      justify-content: space-between;
    }
    .panel p {
      color: var(--color-text-muted);
      font-size: 13px;
      min-height: 66px;
    }
    .link-label {
      font-size: 12px;
      font-weight: 600;
    }
    .note {
      margin-top: 28px;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    @media (max-width: 1050px) {
      .areas {
        grid-template-columns: 1fr;
      }
      .panel p {
        min-height: 0;
      }
    }
    @media (max-width: 500px) {
      .metrics {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-4);
        margin-top: var(--space-6);
      }
      .metric {
        padding: var(--space-5);
      }
      .metric h2 {
        margin: var(--space-4) 0 var(--space-2);
        font-size: var(--text-sm);
      }
      .metric-value {
        font-family: var(--font-heading);
        font-size: 2rem;
        margin: 0;
      }
      .metric-description {
        color: var(--color-text-muted);
        font-size: var(--text-xs);
        margin-bottom: 0;
      }
      @media (min-width: 600px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (min-width: 1200px) {
        .metrics {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      .welcome {
        padding: 24px;
      }
      .art {
        display: none;
      }
    }
  `,
})
export class Dashboard {
  protected readonly metrics = [
    {
      title: 'Open repairs',
      tone: 'info' as const,
      label: 'In progress',
      description: 'Work currently on the bench.',
    },
    {
      title: 'Ready for pickup',
      tone: 'success' as const,
      label: 'Ready',
      description: 'Finished work awaiting collection.',
    },
    {
      title: 'Overdue orders',
      tone: 'error' as const,
      label: '! Needs attention',
      description: 'Orders past their agreed date.',
    },
    {
      title: 'Upcoming deadlines',
      tone: 'warning' as const,
      label: 'Due soon',
      description: 'Dates to keep in view.',
    },
  ];
  protected readonly areas = [
    {
      number: '01',
      title: 'Customers',
      path: '/customers',
      description: 'Build lasting relationships with the people who trust your craft.',
    },
    {
      number: '02',
      title: 'Instruments',
      path: '/instruments',
      description: 'Make space for every instrument and its individual story.',
    },
    {
      number: '03',
      title: 'Repairs',
      path: '/repairs',
      description: 'Bring clarity to each repair, from first look to final note.',
    },
  ];
}
