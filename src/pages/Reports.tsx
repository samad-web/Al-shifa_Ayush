import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, TrendingUp, Users, CalendarCheck } from 'lucide-react';
import { Navigation } from '@/components/layout/navigation';
import { MonthlyCompletedAppointments } from '@/components/MonthlyCompletedAppointments';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function Reports() {
  const [loading, setLoading] = useState(false);

  const handleExport = async (type: string, format: 'csv' | 'pdf') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/api/reports/${type}/export/${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="pt-20 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1">
                View detailed analytics and export reports
              </p>
            </div>
          </div>

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="appointments">
                <BarChart3 className="h-4 w-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="patients">
                <Users className="h-4 w-4 mr-2" />
                Patient Progress
              </TabsTrigger>
              <TabsTrigger value="doctors">
                <TrendingUp className="h-4 w-4 mr-2" />
                Doctor Performance
              </TabsTrigger>
              <TabsTrigger value="prescriptions">
                <FileText className="h-4 w-4 mr-2" />
                Prescriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <CalendarCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Monthly Completed Appointments</h2>
                      <p className="text-sm text-muted-foreground">Detailed breakdown of all completed sessions this month</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleExport('appointments', 'csv')}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <MonthlyCompletedAppointments />
              </Card>
            </TabsContent>

            <TabsContent value="patients" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Patient Progress Reports</h2>
                  <Button
                    onClick={() => handleExport('patient-progress', 'csv')}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Patient progress charts coming soon</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="doctors" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Doctor Performance Analytics</h2>
                  <Button
                    onClick={() => handleExport('doctor-performance', 'pdf')}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Doctor performance metrics coming soon</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="prescriptions" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Prescription Analytics</h2>
                </div>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Prescription analytics coming soon</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
