import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!isLogin) {
        // Registration validation
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Error",
            description: "Password dan konfirmasi password tidak sama!",
            variant: "destructive"
          });
          return;
        }

        if (formData.password.length < 6) {
          toast({
            title: "Error", 
            description: "Password minimal 6 karakter!",
            variant: "destructive"
          });
          return;
        }

        // Register user
        const registerData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        };

        await ApiService.register(registerData);
        
        toast({
          title: "Registrasi Berhasil!",
          description: "Akun berhasil dibuat, silakan login",
        });

        // Switch to login mode and keep email
        setIsLogin(true);
        setFormData({ 
          firstName: '', 
          lastName: '', 
          email: formData.email, // Keep email for convenience
          password: '', 
          confirmPassword: '' 
        });
      } else {
        // Login user
        const loginData = {
          email: formData.email,
          password: formData.password
        };

        const response = await ApiService.login(loginData);
        
        toast({
          title: "Login Berhasil!",
          description: `Selamat datang, ${response.user.nama_lengkap}!`,
        });

        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    setFormData({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      password: '', 
      confirmPassword: '' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card shadow-glow border-0 animate-scale-in">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {isLogin ? 'Masuk' : 'Daftar'}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Sistem Penilaian Isian Singkat Otomatis' 
                : 'Buat akun baru'
              }
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nama Depan</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Nama depan"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required={!isLogin}
                      disabled={isLoading}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nama Belakang</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Nama belakang"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required={!isLogin}
                      disabled={isLoading}
                      className="h-12"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Masukkan email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="h-12 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Konfirmasi password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isLogin}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:opacity-90 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Masuk...' : 'Daftar...'}
                  </>
                ) : (
                  isLogin ? 'Masuk' : 'Daftar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                <Button
                  variant="link"
                  className="p-0 ml-1 h-auto text-primary hover:text-primary-dark"
                  onClick={handleModeSwitch}
                  disabled={isLoading}
                >
                  {isLogin ? 'Daftar sekarang' : 'Masuk di sini'}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}