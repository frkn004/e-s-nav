// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri
// Gerçek uygulamada bu bilgiler environment variables'tan gelecek
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Supabase client'ı oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database helper functions
export const db = {
  // Firmalar
  firmalar: {
    // Tüm firmaları getir (admin için)
    async getAll() {
      const { data, error } = await supabase
        .from('firmalar')
        .select('*')
        .order('olusturma_tarihi', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // Firma ekle
    async create(firmaData) {
      const { data, error } = await supabase
        .from('firmalar')
        .insert([firmaData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    // Email ile firma bul
    async getByEmail(email) {
      const { data, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return data;
    },

    // ID ile firma bul
    async getById(id) {
      const { data, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    // Firma güncelle
    async update(id, updates) {
      const { data, error } = await supabase
        .from('firmalar')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Kullanıcılar
  kullanicilar: {
    // Firma kullanıcılarını getir
    async getByFirmaId(firmaId) {
      const { data, error } = await supabase
        .from('kullanicilar')
        .select('*')
        .eq('firma_id', firmaId)
        .order('kayit_tarihi', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // Kullanıcı ekle
    async create(kullaniciData) {
      const { data, error } = await supabase
        .from('kullanicilar')
        .insert([kullaniciData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    // Email ile kullanıcı bul
    async getByEmail(email) {
      const { data, error } = await supabase
        .from('kullanicilar')
        .select(`
          *,
          firmalar (*)
        `)
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    // Kullanıcı güncelle
    async update(id, updates) {
      const { data, error } = await supabase
        .from('kullanicilar')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Sorular
  sorular: {
    // Tüm soruları getir
    async getAll(filters = {}) {
      let query = supabase
        .from('sorular')
        .select('*')
        .eq('aktif', true);

      if (filters.kategori) {
        query = query.eq('kategori', filters.kategori);
      }
      
      if (filters.zorluk) {
        query = query.eq('zorluk', filters.zorluk);
      }

      const { data, error } = await query.order('olusturma_tarihi', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // Rastgele sorular getir (sınav için)
    async getRandom(count = 20, filters = {}) {
      let query = supabase
        .from('sorular')
        .select('*')
        .eq('aktif', true);

      if (filters.kategori) {
        query = query.eq('kategori', filters.kategori);
      }
      
      if (filters.zorluk) {
        query = query.eq('zorluk', filters.zorluk);
      }

      const { data, error } = await query.limit(count * 3); // 3x fazla getir, rastgele seç
      
      if (error) throw error;
      
      // Rastgele karıştır ve istenen sayıda döndür
      const shuffled = data.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
  },

  // Kitaplar
  kitaplar: {
    // Kullanıcının erişebileceği kitapları getir
    async getAccessible(firmaId = null) {
      let query = supabase
        .from('kitaplar')
        .select('*')
        .eq('aktif', true);

      // Sistem kitapları + firma kitapları
      if (firmaId) {
        query = query.or(`tip.eq.SISTEM_VARSAYILAN,and(tip.eq.FIRMA_YUKLENEN,firma_id.eq.${firmaId})`);
      } else {
        query = query.eq('tip', 'SISTEM_VARSAYILAN');
      }

      const { data, error } = await query.order('olusturma_tarihi', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // Kitap ekle
    async create(kitapData) {
      const { data, error } = await supabase
        .from('kitaplar')
        .insert([kitapData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Sınavlar
  sinavlar: {
    // Kullanıcının sınavlarını getir
    async getByKullaniciId(kullaniciId) {
      const { data, error } = await supabase
        .from('sinavlar')
        .select('*')
        .eq('kullanici_id', kullaniciId)
        .order('baslangic_tarihi', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // Sınav oluştur
    async create(sinavData) {
      const { data, error } = await supabase
        .from('sinavlar')
        .insert([sinavData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    // Sınav güncelle
    async update(id, updates) {
      const { data, error } = await supabase
        .from('sinavlar')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // AI Chat
  aiChat: {
    // Chat geçmişi getir
    async getHistory(kullaniciId, limit = 50) {
      const { data, error } = await supabase
        .from('ai_chat_gecmis')
        .select('*')
        .eq('kullanici_id', kullaniciId)
        .order('olusturma_tarihi', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },

    // Chat kaydet
    async saveChat(chatData) {
      const { data, error } = await supabase
        .from('ai_chat_gecmis')
        .insert([chatData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Lisans kodları
  lisansKodlari: {
    // Lisans kodu kontrol et
    async checkCode(kod) {
      const { data, error } = await supabase
        .from('lisans_kodlari')
        .select('*')
        .eq('kod', kod.toUpperCase())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    // Lisans kodunu kullan
    async useCode(kod, firmaId) {
      const { data, error } = await supabase
        .from('lisans_kodlari')
        .update({
          kullanildi: true,
          kullanim_tarihi: new Date().toISOString(),
          kullanilan_firma_id: firmaId
        })
        .eq('kod', kod.toUpperCase())
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }
};

// Authentication helpers
export const auth = {
  // Kullanıcı giriş yap
  async signIn(email, password) {
    // Supabase auth yerine custom auth kullanıyoruz
    // Çünkü firma/öğrenci rolleri var
    
    const kullanici = await db.kullanicilar.getByEmail(email);
    if (!kullanici) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Şifre kontrol et (bcrypt kullanılacak)
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, kullanici.sifre_hash);
    
    if (!isValidPassword) {
      throw new Error('Şifre hatalı');
    }

    // Son giriş tarihini güncelle
    await db.kullanicilar.update(kullanici.id, {
      son_giris: new Date().toISOString()
    });

    return kullanici;
  },

  // Şifre hash'le
  async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
};

// Mock mode flag - gerçek DB olmadığında kullan
// FORCE MOCK MODE for demo
export const MOCK_MODE = true; // Force enable mock mode for demo

console.log('Supabase initialized:', MOCK_MODE ? 'MOCK MODE' : 'REAL DB MODE'); 