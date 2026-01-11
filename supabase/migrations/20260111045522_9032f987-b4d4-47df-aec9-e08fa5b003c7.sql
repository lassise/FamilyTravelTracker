-- Drop existing SELECT policy and recreate with explicit authentication check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a more secure SELECT policy that explicitly requires authentication
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Also secure the UPDATE policy to only allow authenticated users
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);