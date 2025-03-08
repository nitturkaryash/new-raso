-- Function to get a transaction by ID with public access (bypassing RLS)
-- This allows shared invoice links to work without authentication
CREATE OR REPLACE FUNCTION public.get_public_transaction(transaction_id uuid)
RETURNS SETOF public.transactions
LANGUAGE sql
SECURITY DEFINER -- Run with privileges of the function creator
AS $$
    SELECT * FROM public.transactions WHERE id = transaction_id LIMIT 1;
$$;

-- Grant EXECUTE to public so anyone can use this function
-- This is safe because we're only allowing READ access to a specific record by ID
GRANT EXECUTE ON FUNCTION public.get_public_transaction(uuid) TO public;

-- Comment explaining the function
COMMENT ON FUNCTION public.get_public_transaction(uuid) IS 
'Get a transaction by ID with public access. This allows shared invoice links to work without authentication.'; 