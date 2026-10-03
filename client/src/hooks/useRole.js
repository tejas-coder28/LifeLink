import { useAuth } from './useAuth';

export const useAccountType = () => {
  const { user, accountType, role } = useAuth();
  const currentType = accountType || role;
  const isUser = currentType === 'user' || currentType === 'individual' || currentType === 'donor' || currentType === 'recipient';
  const isHospital = currentType === 'hospital';
  const isAdmin = currentType === 'admin';

  return {
    accountType: currentType,
    role: currentType,
    isUser,
    isIndividual: isUser,
    isDonor: isUser,
    isRecipient: isUser,
    isHospital,
    isAdmin,
  };
};

export const useRole = useAccountType;
