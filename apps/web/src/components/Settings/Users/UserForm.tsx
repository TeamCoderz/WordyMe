/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group';
import { Label } from '@repo/ui/components/label';
import { Separator } from '@repo/ui/components/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { SettingsRole } from '@repo/types/role';
// import { createUser, deleteUser, updateUser } from "@/actions/users.actions";
// import { useRouter } from "next/navigation";
import { SettingsUser } from '@repo/types/user';
import { Link } from '@tanstack/react-router';
import { Trash2Icon } from '@repo/ui/components/icons';

const UserFormSchema = z
  .object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    email: z.string().email({
      message: 'Please enter a valid email address.',
    }),
    role: z.string().min(1, { message: 'Please select a role.' }),
    sendInviteEmail: z.boolean(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    preferredLanguage: z.string(),
  })
  .refine(
    (data) => {
      if (!data.sendInviteEmail) {
        return data.password && data.password.length >= 8;
      }
      return true;
    },
    {
      message: 'Password must be at least 8 characters long.',
      path: ['password'],
    },
  )
  .refine(
    (data) => {
      if (!data.sendInviteEmail) {
        return data.confirmPassword && data.confirmPassword.length > 0;
      }
      return true;
    },
    {
      message: 'Please confirm your password.',
      path: ['confirmPassword'],
    },
  )
  .refine(
    (data) => {
      if (!data.sendInviteEmail && data.password && data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    },
  );

type UserFormData = z.infer<typeof UserFormSchema>;
type UserFormProps = {
  roles: SettingsRole[];
  user?: SettingsUser;
};

function UserForm({ roles, user }: UserFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role.id || '',
      sendInviteEmail: true,
      preferredLanguage: 'english',
      password: '',
      confirmPassword: '',
    },
  });
  // const router = useRouter();
  async function onSubmit(_data: UserFormData) {
    // const result = !user
    //   ? await createUser({
    //       email: data.email,
    //       name: data.name,
    //       role: data.role,
    //     })
    //   : await updateUser(user.id, {
    //       email: data.email,
    //       name: data.name,
    //       role: data.role,
    //     });
    // if (result.success) {
    //   toast(!user ? "User created successfully" : "User updated successfully");
    //   router.push("/settings/users");
    // } else {
    //   toast.error(result.error);
    // }
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const sendInviteEmail = form.watch('sendInviteEmail');
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">User Details</h3>
            <p className="text-sm text-muted-foreground">
              Set a display name and an email address for this user. The email address will be used
              for logging into the application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">User Roles</h3>
            <p className="text-sm text-muted-foreground">
              Select which role this user will be assigned to. Each user can only have one role.
            </p>
          </div>

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={role.id} id={role.id} />
                        <Label htmlFor={role.id}>{role.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">User Password</h3>
            <p className="text-sm text-muted-foreground">
              You can choose to send this user an invitation email which allows them to set their
              own password otherwise you can set their password yourself.
            </p>
          </div>

          <FormField
            control={form.control}
            name="sendInviteEmail"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Send user invite email</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {!sendInviteEmail && (
            <>
              <p className="text-sm text-muted-foreground">
                Set a password used to log-in to the application. This must be at least 8 characters
                long.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Confirm password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Preferred Language</h3>
            <p className="text-sm text-muted-foreground">
              This option will change the language used for the user-interface of the application.
              This will not affect any user-created content.
            </p>
          </div>

          <FormField
            control={form.control}
            name="preferredLanguage"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="italian">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button asChild type="button" variant="outline">
            <Link to={'/settings/users' as any}>Cancel</Link>
          </Button>
          {user && (
            <Button
              type="button"
              onClick={async () => {
                // const result = await deleteUser(user.id);
                // if (result.success) {
                //   toast.success("User deleted successfully");
                //   router.push("/settings/users");
                // } else {
                //   toast.error(result.error);
                // }
              }}
              variant="destructive"
            >
              <Trash2Icon className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
}

export default UserForm;
