/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
// import { toast } from "sonner";
import { z } from 'zod';

import { Button } from '@repo/ui/components/button';

import { Checkbox } from '@repo/ui/components/checkbox';
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
import { Separator } from '@repo/ui/components/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { SettingsRole } from '@repo/types/role';
// import { createRole, updateRole } from "@/actions/roles.actions";
// import { useRouter } from "next/navigation";

const PermissionsFormSchema = z.object({
  roleName: z.string().min(2, {
    message: 'Role name must be at least 2 characters.',
  }),
  roleDescription: z.string().optional(),
  requiresMfa: z.boolean(),
  systemPermissions: z.object({
    manageAllBookChapterPagePermissions: z.boolean(),
    managePermissionsOnOwnBook: z.boolean(),
    managePageTemplates: z.boolean(),
    accessSystemApi: z.boolean(),
    exportContent: z.boolean(),
    importContent: z.boolean(),
    changePageEditor: z.boolean(),
    receiveManageNotifications: z.boolean(),
    manageAppSettings: z.boolean(),
    manageUsers: z.boolean(),
    manageRolesAndPermissions: z.boolean(),
  }),
  assetPermissions: z.object({
    pages: z.object({
      createOwn: z.boolean(),
      createAll: z.boolean(),
      viewOwn: z.boolean(),
      viewAll: z.boolean(),
      editOwn: z.boolean(),
      editAll: z.boolean(),
      deleteOwn: z.boolean(),
      deleteAll: z.boolean(),
    }),
    attachments: z.object({
      create: z.boolean(),
      editOwn: z.boolean(),
      editAll: z.boolean(),
      deleteOwn: z.boolean(),
      deleteAll: z.boolean(),
    }),
  }),
});

type PermissionsFormData = z.infer<typeof PermissionsFormSchema>;
type PermissionsFormProps = {
  role?: SettingsRole;
};

export default function CreateRoleForm({ role }: PermissionsFormProps) {
  const form = useForm<PermissionsFormData>({
    defaultValues: {
      roleName: role?.name || '',
      roleDescription: role?.description || '',
      requiresMfa: false,
      systemPermissions: {
        manageAllBookChapterPagePermissions: false,
        managePermissionsOnOwnBook: false,
        managePageTemplates: false,
        accessSystemApi: false,
        exportContent: false,
        importContent: false,
        changePageEditor: false,
        receiveManageNotifications: false,
        manageAppSettings: false,
        manageUsers: false,
        manageRolesAndPermissions: false,
      },
      assetPermissions: {
        pages: {
          createOwn: false,
          createAll: false,
          viewOwn: false,
          viewAll: false,
          editOwn: false,
          editAll: false,
          deleteOwn: false,
          deleteAll: false,
        },
        attachments: {
          create: false,
          editOwn: false,
          editAll: false,
          deleteOwn: false,
          deleteAll: false,
        },
      },
    },
    resolver: zodResolver(PermissionsFormSchema),
  });
  // const router = useRouter();
  async function onSubmit(_data: PermissionsFormData) {
    // const result = role
    //   ? await updateRole({
    //       id: role.id,
    //       name: data.roleName,
    //       description: data.roleDescription,
    //       permissions: [],
    //       assigned_users: 0,
    //     })
    //   : await createRole({
    //       name: data.roleName,
    //       description: data.roleDescription,
    //       permissions: [],
    //       assigned_users: 0,
    //     });
    // if (result.success) {
    //   toast.success(
    //     role ? "Role updated successfully" : "Role created successfully",
    //   );
    //   router.push("/settings/roles");
    // } else {
    //   toast.error("Failed to create role");
    // }
  }

  function toggleAllPermissions() {
    const currentValues = form.getValues();

    // Check if ANY permission is checked
    const anyChecked = [
      Object.values(currentValues.assetPermissions.pages),
      Object.values(currentValues.assetPermissions.attachments),
    ].some((value) => value.some((v) => v === true));

    const newValue = !anyChecked;

    Object.keys(currentValues.assetPermissions.pages).forEach((key) => {
      form.setValue(
        `assetPermissions.pages.${key as keyof PermissionsFormData['assetPermissions']['pages']}`,
        newValue,
      );
    });
    Object.keys(currentValues.assetPermissions.attachments).forEach((key) => {
      form.setValue(
        `assetPermissions.attachments.${key as keyof PermissionsFormData['assetPermissions']['attachments']}`,
        newValue,
      );
    });
  }

  function togglePagesPermissions() {
    const currentValues = form.getValues();

    // Check if ANY pages permission is checked
    const anyChecked = Object.values(currentValues.assetPermissions.pages).some(
      (value) => value === true,
    );

    // If any are checked, uncheck all. If none are checked, check all.
    const newValue = !anyChecked;

    Object.keys(currentValues.assetPermissions.pages).forEach((key) => {
      form.setValue(
        `assetPermissions.pages.${key as keyof PermissionsFormData['assetPermissions']['pages']}`,
        newValue,
      );
    });
  }

  function toggleAttachmentsPermissions() {
    const currentValues = form.getValues();

    // Check if ANY attachments permission is checked
    const anyChecked = Object.values(currentValues.assetPermissions.attachments).some(
      (value) => value === true,
    );

    // If any are checked, uncheck all. If none are checked, check all.
    const newValue = !anyChecked;

    Object.keys(currentValues.assetPermissions.attachments).forEach((key) => {
      form.setValue(
        `assetPermissions.attachments.${key as keyof PermissionsFormData['assetPermissions']['attachments']}`,
        newValue,
      );
    });
  }

  function toggleSystemPermissions() {
    const currentValues = form.getValues();

    // Check if ANY system permission is checked
    const anyChecked = Object.values(currentValues.systemPermissions).some(
      (value) => value === true,
    );

    // If any are checked, uncheck all. If none are checked, check all.
    const newValue = !anyChecked;
    Object.keys(currentValues.systemPermissions).forEach((key) => {
      form.setValue(
        `systemPermissions.${key as keyof PermissionsFormData['systemPermissions']}`,
        newValue,
      );
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Role Details</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="roleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter role name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter role description"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiresMfa"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Requires Multi-Factor Authentication</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* System Permissions Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">System Permissions</h3>
            <div
              className="text-blue-600 text-sm cursor-pointer hover:underline"
              onClick={toggleSystemPermissions}
            >
              Toggle All
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="systemPermissions.manageAllBookChapterPagePermissions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">
                      Manage all book, chapter & page permissions
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.managePermissionsOnOwnBook"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">
                      Manage permissions on own book, chapter & pages
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.managePageTemplates"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Manage page templates</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.accessSystemApi"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Access system API</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.exportContent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Export content</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.importContent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Import content</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.changePageEditor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Change page editor</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.receiveManageNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Receive & manage notifications</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="systemPermissions.manageAppSettings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Manage app settings</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.manageUsers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Manage users</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPermissions.manageRolesAndPermissions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm">Manage roles & role permissions</FormLabel>
                  </FormItem>
                )}
              />

              <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mt-4">
                <p className="text-sm text-orange-800">
                  Be aware that access to any of the above three permissions can allow a user to
                  alter their own privileges or the privileges of others in the system. Only assign
                  roles with these permissions to trusted users.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Asset Permissions Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Asset Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Permissions control what actions a user can perform on system assets. Permissions are
              Books, Chapters and Pages which are created with system permissions.
            </p>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">
                    <span
                      className="text-blue-600 cursor-pointer hover:underline"
                      onClick={toggleAllPermissions}
                    >
                      Toggle All
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Create</TableHead>
                  <TableHead className="text-center">View</TableHead>
                  <TableHead className="text-center">Edit</TableHead>
                  <TableHead className="text-center">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Pages */}
                <TableRow>
                  <TableCell>
                    <div>
                      <div className="font-medium">Pages</div>
                      <div
                        className="text-blue-600 text-sm cursor-pointer hover:underline"
                        onClick={togglePagesPermissions}
                      >
                        Toggle All
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.createOwn"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">Own</span>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.createAll"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">All</span>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.viewOwn"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">Own</span>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.viewAll"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">All</span>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.editOwn"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">Own</span>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.editAll"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">All</span>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.deleteOwn"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">Own</span>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.pages.deleteAll"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">All</span>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Attachments */}
                <TableRow>
                  <TableCell>
                    <div>
                      <div className="font-medium">Attachments</div>
                      <div
                        className="text-blue-600 text-sm cursor-pointer hover:underline"
                        onClick={toggleAttachmentsPermissions}
                      >
                        Toggle All
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="assetPermissions.attachments.create"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-center">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <p className="text-xs flex justify-center items-center text-muted-foreground">
                      Controlled by the asset they are uploaded to
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.attachments.editOwn"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">Own</span>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.attachments.editAll"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">All</span>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.attachments.deleteOwn"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">Own</span>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-x-2">
                          <FormField
                            control={form.control}
                            name="assetPermissions.attachments.deleteAll"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <span className="text-sm">All</span>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            * Use caution when assigning the delete permission. Once an asset is deleted it cannot
            easily be recovered.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">{role ? 'Update Role' : 'Save Role'}</Button>
        </div>
      </form>
    </Form>
  );
}
