// Auth related API interfaces
export const login = async (credentials: any) => {
  // Mock API call
  return { token: 'mock-token' };
};

export const logout = async () => {
  // Mock API call
  return { success: true };
};
