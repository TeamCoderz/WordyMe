'use client';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Switch } from '@repo/ui/components/switch';
import { TopBarFormValues } from '@/schemas/top-bar-form.schema';
import { useFormContext } from 'react-hook-form';
import TopBarThemeDropDown from './TopBarThemeDropDown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { useActions, useSelector } from '@/store';

export default function TopBarTheming() {
  const form = useFormContext<TopBarFormValues>();
  const top_bar_gradient = useSelector((state) => state.instanceSettings!.top_bar_gradient);
  const { setEndColor, setStartColor, setTopBarTheme, setDirection, setIsGradient } = useActions();

  return (
    <>
      <FormField
        control={form.control}
        name="top_bar_gradient"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <div>
              <FormLabel className="text-base">Top bar gradient</FormLabel>
              <FormDescription>Make top bar color as gradient</FormDescription>
              <FormMessage />
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked === true) {
                    form.setValue('top_bar_start_color', 'default', {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    form.setValue('top_bar_end_color', 'default', {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    form.setValue('top_bar_gradient_direction', 'right', {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    form.setValue('top_bar_gradient', true, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    setDirection('right');
                    setStartColor('default');
                    setEndColor('default');
                    setIsGradient(true);
                  } else {
                    form.setValue('top_bar_gradient', false, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    form.setValue('top_bar_theme_color', 'default', {
                      shouldDirty: true,
                    });
                    setTopBarTheme('default');
                    setIsGradient(false);
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {!top_bar_gradient ? (
        <FormField
          control={form.control}
          name="top_bar_theme_color"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base">Top Bar Theme</FormLabel>
                  <FormDescription>Change the Top Bar theme.</FormDescription>
                  <FormMessage />
                </div>
                <TopBarThemeDropDown field={field} />
              </div>
            </FormItem>
          )}
        />
      ) : (
        <>
          <FormField
            control={form.control}
            name="top_bar_gradient_direction"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>Gradient Direction</FormLabel>
                  <FormDescription>Select the top bar gradient direction.</FormDescription>
                  <FormMessage />
                </div>
                <Select
                  onValueChange={(value) => {
                    setDirection(value as 'bottom' | 'right');
                    field.onChange(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a direction of the gradient to show" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="right">To Right</SelectItem>
                    <SelectItem value="bottom">To Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="top_bar_start_color"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base">Top Bar start color</FormLabel>
                    <FormDescription>Change the Top Bar start color.</FormDescription>
                    <FormMessage />
                  </div>
                  <TopBarThemeDropDown type="start" field={field} />
                </div>
              </FormItem>
            )}
          />{' '}
          <FormField
            control={form.control}
            name="top_bar_end_color"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base">Top Bar end color</FormLabel>
                    <FormDescription>Change the Top end color.</FormDescription>
                    <FormMessage />
                  </div>
                  <TopBarThemeDropDown field={field} type="end" />
                </div>
              </FormItem>
            )}
          />
        </>
      )}
    </>
  );
}
