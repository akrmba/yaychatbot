import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" defaultValue="Jane" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" defaultValue="Smith" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="jane@acme.com" />
          </div>
          <div className="flex justify-end">
            <Button>Save profile</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" />
          </div>
          <div className="flex justify-end">
            <Button>Update password</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">Delete account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
