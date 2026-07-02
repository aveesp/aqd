import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService, UpdateProfilePayload, photoUrl } from '../../core/services/profile.service';
import { DocumentType, Profile } from '../../core/models/profile.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'government_id', label: 'Government ID' },
  { value: 'address_proof', label: 'Address proof' },
  { value: 'other', label: 'Other' },
];

// Untouched form fields come back as '' rather than undefined; the backend's
// per-section merge only treats `undefined` as "not provided", so a blank
// string would overwrite a previously-saved value. Strip blanks before
// sending so only fields the user actually filled in are merged.
function withoutBlanks<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  ) as Partial<T>;
}

@Component({
  selector: 'app-profile-edit',
  imports: [ReactiveFormsModule, NavBar],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEdit implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPrivacy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);

  readonly photoUrl = photoUrl;
  readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  readonly profile = signal<Profile | null>(null);
  readonly uploadingPhoto = signal(false);
  readonly photoActionId = signal<string | null>(null);
  readonly uploadingDocument = signal(false);
  readonly selectedDocType = signal<DocumentType>('government_id');
  readonly photoError = signal<string | null>(null);
  readonly documentError = signal<string | null>(null);

  readonly personalForm = this.fb.nonNullable.group({
    bio: [''],
    maritalStatus: [''],
    heightCm: [''],
  });

  readonly familyForm = this.fb.nonNullable.group({
    fatherOccupation: [''],
    motherOccupation: [''],
    siblings: [''],
    familyType: [''],
    familyValues: [''],
  });

  readonly educationForm = this.fb.nonNullable.group({
    level: [''],
    field: [''],
    institution: [''],
  });

  readonly occupationForm = this.fb.nonNullable.group({
    title: [''],
    industry: [''],
    incomeBand: [''],
  });

  readonly religionForm = this.fb.nonNullable.group({
    sect: [''],
    maslak: [''],
    prayerStatus: [''],
  });

  readonly lifestyleForm = this.fb.nonNullable.group({
    diet: [''],
    smoking: [''],
  });

  readonly locationForm = this.fb.nonNullable.group({
    country: [''],
    state: [''],
    city: [''],
    area: [''],
    pincode: [''],
  });

  readonly partnerPreferencesForm = this.fb.nonNullable.group({
    ageMin: [''],
    ageMax: [''],
    heightMin: [''],
    heightMax: [''],
    sect: [''],
    maslak: [''],
    location: [''],
    education: [''],
    income: [''],
  });

  readonly privacyForm = this.fb.nonNullable.group({
    hidePhotos: [false],
    hideContact: [false],
    hideLastActive: [false],
  });

  ngOnInit(): void {
    this.profileService.getOwn().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.patchForms(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load your profile. Create one from the Profile page first.');
      },
    });
  }

  private patchForms(p: Profile): void {
    this.personalForm.patchValue({
      bio: p.personal.bio ?? '',
      maritalStatus: p.personal.maritalStatus ?? '',
      heightCm: p.personal.heightCm ? String(p.personal.heightCm) : '',
    });
    this.familyForm.patchValue({
      fatherOccupation: p.family?.fatherOccupation ?? '',
      motherOccupation: p.family?.motherOccupation ?? '',
      siblings: p.family?.siblings !== undefined ? String(p.family.siblings) : '',
      familyType: p.family?.familyType ?? '',
      familyValues: p.family?.familyValues ?? '',
    });
    this.educationForm.patchValue({
      level: p.education?.level ?? '',
      field: p.education?.field ?? '',
      institution: p.education?.institution ?? '',
    });
    this.occupationForm.patchValue({
      title: p.occupation?.title ?? '',
      industry: p.occupation?.industry ?? '',
      incomeBand: p.occupation?.incomeBand ?? '',
    });
    this.religionForm.patchValue({
      sect: p.religion?.sect ?? '',
      maslak: p.religion?.maslak ?? '',
      prayerStatus: p.religion?.prayerStatus ?? '',
    });
    this.lifestyleForm.patchValue({
      diet: p.lifestyle?.diet ?? '',
      smoking: p.lifestyle?.smoking ?? '',
    });
    this.locationForm.patchValue({
      country: p.location?.country ?? '',
      state: p.location?.state ?? '',
      city: p.location?.city ?? '',
      area: p.location?.area ?? '',
      pincode: p.location?.pincode ?? '',
    });
    this.partnerPreferencesForm.patchValue({
      ageMin: p.partnerPreferences?.ageMin !== undefined ? String(p.partnerPreferences.ageMin) : '',
      ageMax: p.partnerPreferences?.ageMax !== undefined ? String(p.partnerPreferences.ageMax) : '',
      heightMin: p.partnerPreferences?.heightMin !== undefined ? String(p.partnerPreferences.heightMin) : '',
      heightMax: p.partnerPreferences?.heightMax !== undefined ? String(p.partnerPreferences.heightMax) : '',
      sect: p.partnerPreferences?.sect ?? '',
      maslak: p.partnerPreferences?.maslak ?? '',
      location: p.partnerPreferences?.location ?? '',
      education: p.partnerPreferences?.education ?? '',
      income: p.partnerPreferences?.income ?? '',
    });
    this.privacyForm.patchValue({
      hidePhotos: p.privacy?.hidePhotos ?? false,
      hideContact: p.privacy?.hideContact ?? false,
      hideLastActive: p.privacy?.hideLastActive ?? false,
    });
  }

  saveProfile(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.savedMessage.set(null);

    const toNumber = (v: string) => (v === '' ? undefined : Number(v));

    const payload: UpdateProfilePayload = {
      personal: withoutBlanks(this.personalForm.getRawValue()) as UpdateProfilePayload['personal'],
      family: withoutBlanks(this.familyForm.getRawValue()) as UpdateProfilePayload['family'],
      education: withoutBlanks(this.educationForm.getRawValue()),
      occupation: withoutBlanks(this.occupationForm.getRawValue()),
      religion: withoutBlanks(this.religionForm.getRawValue()),
      lifestyle: withoutBlanks(this.lifestyleForm.getRawValue()),
      location: withoutBlanks(this.locationForm.getRawValue()),
      partnerPreferences: withoutBlanks(this.partnerPreferencesForm.getRawValue()) as UpdateProfilePayload['partnerPreferences'],
    };

    // Numeric fields arrive as strings from the form; convert the ones that
    // survived withoutBlanks.
    if (payload.personal?.heightCm !== undefined) {
      payload.personal.heightCm = toNumber(payload.personal.heightCm as unknown as string);
    }
    if (payload.family?.siblings !== undefined) {
      payload.family.siblings = toNumber(payload.family.siblings as unknown as string);
    }
    if (payload.partnerPreferences) {
      for (const key of ['ageMin', 'ageMax', 'heightMin', 'heightMax'] as const) {
        const v = payload.partnerPreferences[key];
        if (v !== undefined) {
          payload.partnerPreferences[key] = toNumber(v as unknown as string);
        }
      }
    }

    this.profileService.update(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedMessage.set('Profile saved.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not save your profile.');
      },
    });
  }

  savePrivacy(): void {
    this.savingPrivacy.set(true);
    this.errorMessage.set(null);
    this.profileService.updatePrivacy(this.privacyForm.getRawValue()).subscribe({
      next: () => {
        this.savingPrivacy.set(false);
        this.savedMessage.set('Privacy settings saved.');
      },
      error: (err: HttpErrorResponse) => {
        this.savingPrivacy.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not save privacy settings.');
      },
    });
  }

  backToProfile(): void {
    void this.router.navigate(['/dashboard']);
  }

  onPhotoFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    this.photoError.set(null);
    this.uploadingPhoto.set(true);
    this.profileService.uploadPhotos(files).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.uploadingPhoto.set(false);
        input.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingPhoto.set(false);
        this.photoError.set(err.error?.message ?? 'Could not upload photo.');
        input.value = '';
      },
    });
  }

  deletePhoto(photoId: string): void {
    this.photoActionId.set(photoId);
    this.photoError.set(null);
    this.profileService.deletePhoto(photoId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.photoActionId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.photoActionId.set(null);
        this.photoError.set(err.error?.message ?? 'Could not delete photo.');
      },
    });
  }

  setPrimaryPhoto(photoId: string): void {
    this.photoActionId.set(photoId);
    this.photoError.set(null);
    this.profileService.setPrimaryPhoto(photoId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.photoActionId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.photoActionId.set(null);
        this.photoError.set(err.error?.message ?? 'Could not update photo.');
      },
    });
  }

  selectDocType(docType: DocumentType): void {
    this.selectedDocType.set(docType);
  }

  onDocumentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.documentError.set(null);
    this.uploadingDocument.set(true);
    this.profileService.uploadDocument(file, this.selectedDocType()).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.uploadingDocument.set(false);
        input.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingDocument.set(false);
        this.documentError.set(err.error?.message ?? 'Could not upload document.');
        input.value = '';
      },
    });
  }

  viewOwnDocument(docId: string): void {
    this.profileService.getOwnDocumentBlob(docId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => this.documentError.set('Could not open document.'),
    });
  }
}
