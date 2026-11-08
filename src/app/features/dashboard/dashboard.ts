import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader],
  template: `
    <app-page-header
      eyebrow="A place for good work"
      heading="Your workshop, in harmony."
      description="Welcome to Artelier. A calm, connected home for your customers, instruments, and the work you love."
    />
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
    .welcome {
      margin-top: 36px;
      padding: 36px;
      background: #e6ebda;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      gap: 24px;
    }
    .welcome h2 {
      font-family: Georgia, serif;
      font-size: 30px;
      font-weight: 400;
      margin: 18px 0 12px;
    }
    .welcome p {
      font-size: 14px;
      color: #56664e;
      max-width: 440px;
      margin-bottom: 0;
    }
    .art {
      font-family: Georgia, serif;
      font-size: 150px;
      line-height: 1;
      color: #8c9c6b;
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
      border-color: #708960;
    }
    .panel h2 {
      margin: 28px 0 12px;
      display: flex;
      justify-content: space-between;
    }
    .panel p {
      color: var(--color-muted);
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
      color: var(--color-muted);
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
