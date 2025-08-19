import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Trash2,
  Shield,
  AlertTriangle 
} from 'lucide-react';
import { useBetaSettings } from '@/hooks/useBetaSettings';
import { useBetaUsers, BetaUser } from '@/hooks/useBetaUsers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function BetaManagement() {
  const { settings, loading: settingsLoading, updating: settingsUpdating, updateBetaStatus } = useBetaSettings();
  const { users, loading: usersLoading, updating: usersUpdating, updateUserStatus, deleteUser } = useBetaUsers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<BetaUser | null>(null);

  const filteredUsers = users.filter(user =>
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telegram?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.referral_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = (user: BetaUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeUsers = users.filter(user => user.is_active).length;
  const pendingUsers = users.filter(user => !user.is_active).length;

  return (
    <div className="space-y-6">
      {/* Beta Status Control */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
          <div className="space-y-1">
            <Label htmlFor="beta-toggle" className="text-base font-medium">
              Beta Phase Status
            </Label>
            <p className="text-sm text-muted-foreground">
              {settings?.is_beta_active ? 
                'Beta phase is active - only approved users can access the app' : 
                'Beta phase is inactive - all users can access the app'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {settings?.is_beta_active && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">BETA ACTIVE</span>
              </div>
            )}
            <Switch
              id="beta-toggle"
              checked={settings?.is_beta_active || false}
              onCheckedChange={updateBetaStatus}
              disabled={settingsUpdating}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle>Beta Users Management</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex-center p-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Wallet Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Referral</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.display_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.email && (
                            <div className="text-xs text-muted-foreground">
                              📧 {user.email}
                            </div>
                          )}
                          {user.telegram && (
                            <div className="text-xs text-muted-foreground">
                              📱 {user.telegram}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.referral_name && (
                          <span className="text-sm text-muted-foreground">
                            {user.referral_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              disabled={usersUpdating}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateUserStatus(user.id, !user.is_active)}
                              className="flex items-center gap-2"
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              className="flex items-center gap-2 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No users found matching your search.' : 'No beta users found.'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Beta User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{userToDelete?.display_name}" from the beta users list? 
              This action cannot be undone and they will lose access to the app if beta phase is active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}