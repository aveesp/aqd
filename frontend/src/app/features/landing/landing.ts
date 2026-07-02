import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CmsService } from '../../core/services/cms.service';
import { FaqItem, Testimonial } from '../../core/models/cms.model';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private readonly cmsService = inject(CmsService);

  readonly testimonials = signal<Testimonial[]>([]);
  readonly faqItems = signal<FaqItem[]>([]);
  readonly openFaqId = signal<string | null>(null);

  ngOnInit(): void {
    this.cmsService.listTestimonials().subscribe({
      next: (items) => this.testimonials.set(items),
      error: () => {
        /* landing page should render fine even if CMS content fails to load */
      },
    });
    this.cmsService.listFaqItems().subscribe({
      next: (items) => this.faqItems.set(items),
      error: () => {
        /* same as above */
      },
    });
  }

  toggleFaq(id: string): void {
    this.openFaqId.set(this.openFaqId() === id ? null : id);
  }
}
