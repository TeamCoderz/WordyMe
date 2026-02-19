/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useSelector } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import { Button } from '@repo/ui/components/button';
import { useUpdateProfileMutation } from '@/queries/profile';
import { Loader2 } from '@repo/ui/components/icons';
import { useForm } from 'react-hook-form';
import z from 'zod';

const PersonalInformationSchema = z.object({
  first_name: z
    .string({ error: 'First Name is required' })
    .trim()
    .min(2, { message: 'First Name must be at least 2 characters' }),
  last_name: z
    .string({ error: 'Last Name is required' })
    .trim()
    .min(2, { message: 'Last Name must be at least 2 characters' }),
  bio: z.string().trim().optional(),
  job_title: z.string().trim().optional(),
});
type PersonalInformationSchemaType = z.infer<typeof PersonalInformationSchema>;

const PersonalInformation = () => {
  const user = useSelector((state) => state.user);
  const form = useForm<PersonalInformationSchemaType>({
    resolver: zodResolver(PersonalInformationSchema),
    defaultValues: {
      first_name: user?.name?.split(' ')[0],
      last_name: user?.name?.split(' ')[1],
      bio: user?.bio ?? '',
      job_title: user?.jobTitle ?? '',
    },
  });
  const { mutate, isPending } = useUpdateProfileMutation();
  const onSubmit = ({ first_name, last_name, ...data }: PersonalInformationSchemaType) => {
    mutate({
      ...data,
      name: [first_name.trim(), last_name.trim()].filter(Boolean).join(' '),
    });
  };
  return (
    <Card id="personal-information" className="bg-transparent p-0 overflow-hidden gap-0 @container">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-start gap-4 @md:flex-row flex-col">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem className="flex-1 @max-md:w-full">
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem className="flex-1 @max-md:w-full">
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Job title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      className="min-h-32 field-sizing-content max-h-96"
                      placeholder="Enter bio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={isPending} className="flex items-center gap-1" type="submit">
              {isPending ? (
                <>
                  <Loader2 className="!animate-spin" /> Updating...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PersonalInformation;
