'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { UsersService, LocationsService } from '../../../services';
import { User } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { TextArea } from '../../../components/ui/TextArea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';
import { useNavigation } from '../../../hooks/useNavigation';
import { User as UserIcon } from 'lucide-react';
import { PageShell } from '../../../components/layout/PageShell';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BackButton } from '../../../components/shared/BackButton';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio too long'),
  phone: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  images: z.array(z.any()).optional(), // For avatar
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const { navigate } = useNavigation();
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cityOptions, setCityOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [suburbOptions, setSuburbOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isLoadingSuburbs, setIsLoadingSuburbs] = useState(false);
  const previousCityRef = useRef('');

  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      bio: '',
      phone: '',
      city: '',
      suburb: '',
      images: []
    }
  });
  const selectedCity = useWatch({ control, name: 'city' });

  useEffect(() => {
    if (user) {
      setValue('name', user.name);
      setValue('phone', user.phone || '');
      setValue('city', user.location?.city || '');
      setValue('suburb', user.location?.suburb || '');
      // Bio would come from full profile fetch if not in auth user object, fetch here in real app
    }
  }, [user, setValue]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingCities(true);

    LocationsService.getMajorCities(120)
      .then((cities) => {
        if (!isMounted) return;

        const options = cities.map((city) => ({ value: city.name, label: city.name }));
        const currentCity = user?.location?.city?.trim();
        const hasCurrentCity = !!currentCity && options.some((option) => option.value === currentCity);

        if (currentCity && !hasCurrentCity) {
          options.unshift({ value: currentCity, label: currentCity });
        }

        setCityOptions(options);
      })
      .catch(() => {
        if (!isMounted) return;
        const fallbackCity = user?.location?.city?.trim();
        const fallbackOptions = fallbackCity
          ? [{ value: fallbackCity, label: fallbackCity }]
          : [{ value: 'Auckland', label: 'Auckland' }];
        setCityOptions(fallbackOptions);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingCities(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.location?.city]);

  useEffect(() => {
    const normalizedCity = (selectedCity || '').trim();
    if (!normalizedCity) {
      previousCityRef.current = '';
      setSuburbOptions([]);
      setIsLoadingSuburbs(false);
      return;
    }

    if (previousCityRef.current && previousCityRef.current !== normalizedCity) {
      setValue('suburb', '');
    }
    previousCityRef.current = normalizedCity;

    let isMounted = true;
    setIsLoadingSuburbs(true);

    LocationsService.getSuburbsByCity(normalizedCity, 1500)
      .then((suburbs) => {
        if (!isMounted) return;

        const options = suburbs.map((suburb) => ({ value: suburb.name, label: suburb.name }));
        const currentSuburb = (getValues('suburb') || '').trim();
        const hasCurrentSuburb = !!currentSuburb && options.some((option) => option.value === currentSuburb);

        if (currentSuburb && !hasCurrentSuburb) {
          options.unshift({ value: currentSuburb, label: currentSuburb });
        }

        setSuburbOptions(options);
      })
      .catch(() => {
        if (!isMounted) return;
        const currentSuburb = (getValues('suburb') || '').trim();
        setSuburbOptions(currentSuburb ? [{ value: currentSuburb, label: currentSuburb }] : []);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingSuburbs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getValues, selectedCity, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const updates: Partial<User> = {
        name: data.name,
        phone: data.phone,
        location: {
          city: data.city,
          suburb: data.suburb,
          region: data.city
        },
      };

      if (data.images && data.images.length > 0) {
        updates.avatar = URL.createObjectURL(data.images[0]);
      }

      await UsersService.updateProfile(updates);
      updateUser(updates);
      success('Profile updated successfully');
      navigate('/profile');
    } catch {
      toastError('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <PageShell>
      <PageHeader title="Edit Profile" left={<BackButton />} />

      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 md:p-8 border border-app-color shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 relative">
                <Controller
                  name="images"
                  control={control}
                  render={({ field }) => (
                    <>
                      {field.value?.[0] ? (
                        <img src={URL.createObjectURL(field.value[0])} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <img src={user.avatar} className="w-full h-full object-cover" alt="Current" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-xs font-medium">Change</span>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={(e) => field.onChange(e.target.files ? Array.from(e.target.files) : [])}
                        />
                      </div>
                    </>
                  )}
                />
              </div>
              <span className="text-sm text-gray-500">Tap image to change</span>
            </div>

            <Input
              label="Full Name"
              leftIcon={<UserIcon className="w-4 h-4" />}
              {...register('name')}
              error={errors.name?.message}
            />

            <TextArea
              label="Bio"
              placeholder="Tell others a bit about yourself..."
              rows={4}
              {...register('bio')}
              error={errors.bio?.message}
              helperText="Max 500 characters"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <Select
                    label="City"
                    options={cityOptions}
                    value={field.value}
                    onChange={field.onChange}
                    searchable
                    placeholder={isLoadingCities ? 'Loading cities...' : 'Select city'}
                    disabled={isLoadingCities || cityOptions.length === 0}
                    error={errors.city?.message}
                  />
                )}
              />
              <Controller
                name="suburb"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Suburb"
                    options={suburbOptions}
                    value={field.value}
                    onChange={field.onChange}
                    searchable
                    placeholder={!selectedCity ? 'Select city first' : (isLoadingSuburbs ? 'Loading suburbs...' : 'Select suburb')}
                    disabled={!selectedCity || isLoadingSuburbs || suburbOptions.length === 0}
                    error={errors.suburb?.message}
                  />
                )}
              />
            </div>

            <Input
              label="Phone Number"
              placeholder="+64 ..."
              {...register('phone')}
              error={errors.phone?.message}
            />

            <div className="pt-4">
              <Input
                label="Email Address"
                value={user.email}
                disabled
                helperText="Contact support to change email"
                className="bg-gray-100 dark:bg-neutral-800 opacity-70"
              />
            </div>

            <div className="pt-6 flex gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <button className="text-red-500 text-sm hover:underline">
            Delete Account
          </button>
        </div>
      </div>
    </PageShell>
  );
}
