import { useSelector } from '@/store';
import { format } from 'date-fns';

export default function UserInfo() {
  const user = useSelector((state) => state.user);

  const formatLastLogin = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex flex-col">
      <h3 className="font-semibold text-lg @xl:text-xl @2xl:text-2xl truncate">{user?.name}</h3>
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <span className="@max-xl:hidden truncate">{user?.email}</span>
        <svg
          width="4"
          height="4"
          viewBox="0 0 4 4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="@max-xl:hidden"
        >
          <circle cx="2" cy="2" r="2" fill="#999999" />
        </svg>
        <span className="@max-xl:truncate">
          Last login: {formatLastLogin(user?.last_signed_in)}
        </span>
      </p>
    </div>
  );
}
