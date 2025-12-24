// "use client";
// import { Button } from "@repo/ui/components/button";
// import { CardContent, CardFooter } from "@repo/ui/components/card";
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@repo/ui/components/form";
// import { Loader2 } from "@repo/ui/components/icons";

// // import { updateTopBarData } from "@/actions/top-bar.actions";
// import {
//   topBarFormSchema,
//   TopBarFormValues,
// } from "@/schemas/top-bar-form.schema";
// import ImageInputDialog from "./ImageInputDialog";
// import TopBarTheming from "./TopBarTheming";
// import { useActions, useSelector } from "@/store";
// import { toast } from "sonner";
// import { ControllerRenderProps, useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useEffect, useRef, useTransition } from "react";
// import { Input } from "@repo/ui/components/input";
// import { useBlocker } from "@tanstack/react-router";
// import { alert } from "@/components/Layout/alert";
// import { getInstanceSettings } from "@repo/supabase/api/instance-settings";

// function TopBarSettingsForm() {
//   const instanceSettings = useSelector((state) => state.instanceSettings!);
//   const form = useForm<TopBarFormValues>({
//     defaultValues: {
//       instance_name: instanceSettings.instance_name ?? "Wordy",
//       top_bar_theme_color: !instanceSettings.top_bar_gradient
//         ? (instanceSettings.top_bar_theme_color ?? "default")
//         : undefined,
//       instance_logo: instanceSettings.instance_logo ?? "",
//       top_bar_gradient: instanceSettings.top_bar_gradient ?? false,
//       top_bar_start_color: instanceSettings.top_bar_gradient
//         ? instanceSettings.top_bar_start_color
//         : undefined,
//       top_bar_end_color: instanceSettings.top_bar_gradient
//         ? instanceSettings.top_bar_end_color
//         : undefined,
//       top_bar_gradient_direction: instanceSettings.top_bar_gradient
//         ? instanceSettings.top_bar_gradient_direction
//         : undefined,
//     },
//     resolver: zodResolver(topBarFormSchema),
//   });
//   // const { reset } = form;
//   const { setInstanceSettingsRemote, setInstanceSettingsLocal } = useActions();
//   const [isPending, startTransition] = useTransition();
//   const { dirtyFields, isDirty } = form.formState;
//   const { proceed, reset, status } = useBlocker({});

//   const formRef = useRef<HTMLFormElement>(null);

//   useEffect(() => {
//     if (isDirty && status === "blocked") {
//       alert({
//         title: "Unsaved changes",
//         description:
//           "You have unsaved changes. Are you sure you want to leave?",
//         cancelText: "Cancel",
//         confirmText: "Leave",
//         onConfirm: async () => {
//           const result = await getInstanceSettings();
//           if (result.error) {
//             toast.error(result.error.title);
//             return;
//           }
//           setInstanceSettingsLocal(
//             result.data.top_bar_gradient
//               ? {
//                   top_bar_gradient: true,
//                   instance_logo: result.data.instance_logo ?? "",
//                   instance_name: result.data.instance_name ?? "",
//                   top_bar_start_color:
//                     result.data.top_bar_start_color ?? "default",
//                   top_bar_end_color: result.data.top_bar_end_color ?? "default",
//                   top_bar_gradient_direction:
//                     result.data.top_bar_gradient_direction ?? "right",
//                 }
//               : {
//                   top_bar_gradient: false,
//                   top_bar_theme_color:
//                     result.data.top_bar_theme_color ?? "default",
//                   instance_name: result.data.instance_name ?? "",
//                   instance_logo: result.data.instance_logo ?? "",
//                 },
//           );
//           proceed();
//         },
//         onCancel: () => {
//           reset();
//         },
//       });
//     } else if (status === "blocked") {
//       proceed();
//     }
//   }, [status, isDirty]);
//   const onSubmit = (data: TopBarFormValues) => {
//     if (!isDirty) return;
//     const changedFields = Object.keys(
//       dirtyFields,
//     ) as (keyof TopBarFormValues)[];
//     const changedData: Partial<Record<keyof TopBarFormValues, any>> = {};
//     for (const field of changedFields) {
//       changedData[field] = data[field];
//     }
//     startTransition(async () => {
//       const result = await setInstanceSettingsRemote(undefined, changedData);
//       if (result.type === "error") {
//         toast.error(result.message);
//       }
//       if (result.type === "success") {
//         toast.success("Changes applied successfully");
//         form.reset(
//           result.data.top_bar_gradient
//             ? {
//                 top_bar_gradient: true,
//                 instance_logo: result.data.instance_logo ?? "",
//                 instance_name: result.data.instance_name,
//                 top_bar_start_color:
//                   result.data.top_bar_start_color ?? "default",
//                 top_bar_end_color: result.data.top_bar_end_color ?? "default",
//                 top_bar_gradient_direction:
//                   result.data.top_bar_gradient_direction ?? "right",
//               }
//             : {
//                 top_bar_gradient: false,
//                 top_bar_theme_color:
//                   result.data.top_bar_theme_color ?? "default",
//                 instance_logo: result.data.instance_logo ?? "",
//                 instance_name: result.data.instance_name,
//               },
//         );
//       }
//     });
//   };
//   return (
//     <>
//       <CardContent>
//         <Form {...form}>
//           <form
//             ref={formRef}
//             onSubmit={form.handleSubmit(onSubmit)}
//             className="space-y-4"
//           >
//             <FormField
//               control={form.control}
//               name="instance_name"
//               render={({ field }) => <InsanceNameFormField field={field} />}
//             />
//             <FormField
//               control={form.control}
//               name="instance_logo"
//               render={() => (
//                 <FormItem>
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <FormLabel className="text-base">Logo</FormLabel>
//                       <FormDescription>
//                         Change the logo of the top bar.
//                       </FormDescription>
//                       <FormMessage />
//                     </div>
//                     <ImageInputDialog />
//                   </div>
//                 </FormItem>
//               )}
//             />
//             <TopBarTheming />
//           </form>
//         </Form>
//       </CardContent>
//       <CardFooter>
//         <Button
//           type="button"
//           disabled={isPending}
//           onClick={() => {
//             if (formRef.current) formRef.current.requestSubmit();
//           }}
//         >
//           {isPending ? (
//             <>
//               <Loader2 className="animate-spin" /> Applying changes...
//             </>
//           ) : (
//             "Apply changes"
//           )}
//         </Button>
//       </CardFooter>
//     </>
//   );
// }
// function InsanceNameFormField({
//   field,
// }: {
//   field: ControllerRenderProps<TopBarFormValues, "instance_name">;
// }) {
//   const { setInstanceName } = useActions();
//   return (
//     <FormItem>
//       <FormLabel className="text-base">Instance Name</FormLabel>
//       <FormControl>
//         <Input
//           placeholder="Wordy"
//           {...field}
//           onChange={(e) => {
//             setInstanceName(e.target.value);
//             field.onChange(e);
//           }}
//         />
//       </FormControl>
//       <FormDescription>
//         This is the name of your instance. It will appear in the top bar.
//       </FormDescription>
//       <FormMessage />
//     </FormItem>
//   );
// }
// export default TopBarSettingsForm;
