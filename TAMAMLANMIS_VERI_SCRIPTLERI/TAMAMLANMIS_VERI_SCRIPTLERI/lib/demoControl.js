// Demo Süre Takip ve Kontrol Sistemi
import { useState, useEffect } from 'react';

export class DemoControl {
  
  // Demo süresini kontrol et
  static checkDemoStatus(user) {
    if (!user || !user.demo_mode) {
      return { isDemo: false, isExpired: false, remainingTime: null };
    }

    const now = new Date().getTime();
    const demoEnd = new Date(user.demo_bitis).getTime();
    const remainingTime = Math.max(0, demoEnd - now);
    const isExpired = remainingTime === 0;

    return {
      isDemo: true,
      isExpired,
      remainingTime,
      remainingHours: Math.floor(remainingTime / (1000 * 60 * 60)),
      remainingMinutes: Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60)),
      demoEndDate: new Date(user.demo_bitis)
    };
  }

  // Demo süresi bitmiş kullanıcıyı engelle
  static blockExpiredDemo(user, router) {
    const status = this.checkDemoStatus(user);
    
    if (status.isDemo && status.isExpired) {
      // Demo bitmiş, çıkış yap ve yönlendir
      localStorage.removeItem('user');
      
      alert('⏰ Demo süreniz sona erdi!\n\n📦 Premium paketlerimizi inceleyerek hizmetinize devam edebilirsiniz.\n\n🔄 Yönlendiriliyorsunuz...');
      
      if (router) {
        router.push('/demo-bitti');
      }
      return true; // Erişim engellendi
    }
    
    return false; // Erişim devam edebilir
  }

  // Demo uyarısı göster
  static showDemoWarning(user) {
    const status = this.checkDemoStatus(user);
    
    if (!status.isDemo || status.isExpired) return null;

    // Son 2 saat uyarısı
    if (status.remainingTime <= 2 * 60 * 60 * 1000) {
      return {
        type: 'critical',
        message: `⚠️ Demo süreniz ${status.remainingHours} saat ${status.remainingMinutes} dakika sonra bitecek!`,
        action: 'Premium pakete geçiş yapın'
      };
    }

    // Son 6 saat uyarısı  
    if (status.remainingTime <= 6 * 60 * 60 * 1000) {
      return {
        type: 'warning', 
        message: `⏰ Demo süreniz ${status.remainingHours} saat sonra bitecek`,
        action: 'Paket seçimi yapabilirsiniz'
      };
    }

    return null;
  }

  // Demo limitlerini kontrol et
  static checkDemoLimits(user, action) {
    if (!user || !user.demo_mode) return { allowed: true };

    const limits = {
      max_students: 5,
      max_ai_questions: 10,
      max_exams_per_day: 3
    };

    // Mock veri - gerçek uygulamada veritabanından gelecek
    const currentUsage = {
      students: user.current_students || 0,
      ai_questions_used: user.ai_questions_used || 0,
      exams_today: user.exams_today || 0
    };

    switch (action) {
      case 'add_student':
        if (currentUsage.students >= limits.max_students) {
          return {
            allowed: false,
            message: `Demo hesabınızda maksimum ${limits.max_students} öğrenci ekleyebilirsiniz.`,
            upgrade: 'Premium pakete geçerek sınırsız öğrenci ekleyebilirsiniz.'
          };
        }
        break;
        
      case 'ai_question':
        if (currentUsage.ai_questions_used >= limits.max_ai_questions) {
          return {
            allowed: false,
            message: `Demo hesabınızda maksimum ${limits.max_ai_questions} AI sorusu sorabilirsiniz.`,
            upgrade: 'Premium pakete geçerek sınırsız AI desteği alabilirsiniz.'
          };
        }
        break;
        
      case 'take_exam':
        if (currentUsage.exams_today >= limits.max_exams_per_day) {
          return {
            allowed: false,
            message: `Demo hesabınızda günde maksimum ${limits.max_exams_per_day} sınav girebilirsiniz.`,
            upgrade: 'Premium pakete geçerek sınırsız sınav hakkı alabilirsiniz.'
          };
        }
        break;
    }

    return { allowed: true };
  }

  // Demo için upgrade modal göster
  static showUpgradeModal() {
    const upgradeHtml = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(0,0,0,0.8); display: flex; align-items: center; 
        justify-content: center; z-index: 10000;
      ">
        <div style="
          background: white; border-radius: 1rem; padding: 2rem; 
          max-width: 500px; width: 90%; text-align: center;
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⏰</div>
          <h2 style="color: #dc2626; margin-bottom: 1rem;">Demo Süresi Doldu</h2>
          <p style="color: #6b7280; margin-bottom: 2rem;">
            24 saatlik demo süreniz sona erdi. Hizmetinize devam etmek için premium paketlerimizi inceleyin.
          </p>
          <div style="display: flex; gap: 1rem;">
            <button onclick="window.location.href='/'" style="
              flex: 1; padding: 1rem; background: #e5e7eb; border: none; 
              border-radius: 0.5rem; cursor: pointer;
            ">Ana Sayfa</button>
            <button onclick="window.location.href='/paket-secimi'" style="
              flex: 1; padding: 1rem; background: #3b82f6; color: white; 
              border: none; border-radius: 0.5rem; cursor: pointer;
            ">Premium Geç</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', upgradeHtml);
  }
}

// Demo kontrol hook'u
export const useDemoControl = (user) => {
  const [demoStatus, setDemoStatus] = useState(null);
  const [demoWarning, setDemoWarning] = useState(null);

  useEffect(() => {
    if (!user) return;

    const checkDemo = () => {
      const status = DemoControl.checkDemoStatus(user);
      const warning = DemoControl.showDemoWarning(user);
      
      setDemoStatus(status);
      setDemoWarning(warning);
    };

    checkDemo();
    
    // Her dakika kontrol et
    const interval = setInterval(checkDemo, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

  return { demoStatus, demoWarning };
}; 