-- Delete the conflicting wallet user to fix authentication
DELETE FROM auth.users 
WHERE email = '0xcc5632847110bd050b3d6165d551ef9861c5634d@wallet.local';