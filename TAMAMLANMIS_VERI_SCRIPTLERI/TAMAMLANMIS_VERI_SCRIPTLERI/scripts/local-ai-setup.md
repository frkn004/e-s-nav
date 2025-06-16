# 🤖 LOCAL AI MODEL KURULUMU VE EĞİTİMİ

## 🎯 **HEDEF**: API Maliyetlerinden Kurtulmak

### 💰 **Maliyet Karşılaştırması:**
- **OpenAI API**: $20-100/ay 
- **Local Model**: $0/ay (sadece elektrik)
- **İlk kurulum**: $200-500 GPU (tek seferlik)

---

## 🚀 **AŞAMA 1: OLLAMA KURULUMU (30 dakika)**

### 1.1 Ollama İndir ve Kur
```bash
# macOS için
curl -fsSL https://ollama.ai/install.sh | sh

# Veya direkt indirme
# https://ollama.ai/download
```

### 1.2 Llama 3.1 Modeli İndir
```bash
# 8B model (16GB RAM yeterli)
ollama pull llama3.1:8b

# 70B model (64GB+ RAM gerekli)  
ollama pull llama3.1:70b

# Türkçe optimized (önerilen)
ollama pull llama3.1:8b-instruct-q4_K_M
```

### 1.3 Test Et
```bash
ollama run llama3.1:8b "Ehliyet sınavında trafik kuralları nelerdir?"
```

---

## 🧠 **AŞAMA 2: FINE-TUNING HAZIRLIĞI**

### 2.1 Verilerimizi Kullan
Zaten hazırladığımız dosyalar:
- ✅ `ehliyet_finetuning.jsonl` (16 diyalog)
- ✅ `ehliyet_embedding_data.json` (8 bölüm)
- ✅ `ehliyet_qa_dataset.json` (soru-cevap)

### 2.2 Llama Factory Kurulumu
```bash
# LLaMA-Factory (en iyi fine-tuning aracı)
git clone https://github.com/hiyouga/LLaMA-Factory.git
cd LLaMA-Factory
pip install -r requirements.txt
```

### 2.3 Dataset Formatı Düzenle
```python
# convert_dataset.py
import json

# Ehliyet dataseti Llama Factory formatına çevir
def convert_to_llama_format():
    with open('../data/ehliyet_finetuning.jsonl', 'r') as f:
        data = [json.loads(line) for line in f]
    
    llama_format = []
    for item in data:
        llama_format.append({
            "instruction": "Sen bir ehliyet eğitimi uzmanısın.",
            "input": item["messages"][0]["content"],
            "output": item["messages"][1]["content"]
        })
    
    with open('ehliyet_dataset.json', 'w') as f:
        json.dump(llama_format, f, ensure_ascii=False, indent=2)

convert_to_llama_format()
```

---

## 🎓 **AŞAMA 3: FINE-TUNING (2-6 saat)**

### 3.1 Eğitim Komutu
```bash
python src/train.py \
    --model_name_or_path llama3.1:8b \
    --do_train \
    --dataset ehliyet_dataset \
    --template llama3 \
    --finetuning_type lora \
    --lora_target q_proj,v_proj \
    --output_dir ./saves/ehliyet-llama \
    --overwrite_cache \
    --per_device_train_batch_size 2 \
    --gradient_accumulation_steps 4 \
    --lr_scheduler_type cosine \
    --logging_steps 10 \
    --save_steps 1000 \
    --learning_rate 5e-5 \
    --num_train_epochs 3.0 \
    --max_samples 1000 \
    --val_size 0.1 \
    --plot_loss \
    --fp16
```

### 3.2 LoRA Adapters Kullan (Önerilen)
- **Avantajlar**: Hızlı eğitim, az memory
- **Boyut**: 100MB (8B model için)
- **Süre**: 2-4 saat

---

## 🔄 **AŞAMA 4: MODEL ENTEGRASYONU**

### 4.1 Ollama Modelfile Oluştur
```dockerfile
# Modelfile
FROM llama3.1:8b

# Ehliyet uzmanı kişiliği
SYSTEM """
Sen bir ehliyet eğitimi uzmanısın. Türkiye trafik kuralları, ilk yardım ve araç tekniği konularında bilgilisin. 
Öğrencilere yardımcı olurken:
- Net ve anlaşılır açıklamalar yap
- Örneklerle destekle  
- Sınav odaklı cevaplar ver
- Motive edici ol
"""

# Sıcaklık ayarları
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
```

### 4.2 Custom Model Oluştur
```bash
ollama create ehliyet-ai -f Modelfile
ollama run ehliyet-ai "Şehir içi hız limiti nedir?"
```

---

## 🌐 **AŞAMA 5: API SERVER KURULUMU**

### 5.1 Ollama API Server
```bash
# Ollama servisi başlat (arka planda)
ollama serve

# Test et
curl http://localhost:11434/api/generate -d '{
  "model": "ehliyet-ai",
  "prompt": "Emniyet kemeri neden takılır?",
  "stream": false
}'
```

### 5.2 Express.js Wrapper API
```javascript
// local-ai-server.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'ehliyet-ai',
      prompt: message,
      stream: false
    });

    res.json({
      success: true,
      message: response.data.response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(8000, () => {
  console.log('🤖 Local AI Server running on port 8000');
});
```

---

## 🚀 **AŞAMA 6: PRODUCTION HAZIRLIK**

### 6.1 Docker Container
```dockerfile
# Dockerfile
FROM ollama/ollama:latest

# Model dosyalarını kopyala
COPY ./models /root/.ollama/models
COPY ./Modelfile /app/

# Servisi başlat
EXPOSE 11434
CMD ["ollama", "serve"]
```

### 6.2 Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/ai-api
server {
    listen 80;
    server_name ai.ehliyet-saas.com;
    
    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📊 **PERFORMANS VE SCALABILITY**

### Hardware Gereksinimleri:
- **Minimum**: 16GB RAM, RTX 3060
- **Optimal**: 32GB RAM, RTX 4080  
- **Enterprise**: 64GB RAM, RTX 4090

### Model Boyutları:
- **7B-8B**: 4-8GB VRAM
- **13B**: 8-16GB VRAM
- **70B**: 40-80GB VRAM

### Hız Karşılaştırması:
- **Local 8B**: ~50 token/saniye
- **OpenAI GPT-4**: ~20 token/saniye
- **Latency**: Local %90 daha hızlı

---

## 💡 **EK ÖPTİMİZASYONLAR**

### 1. Quantization (Model Sıkıştırma)
```bash
# Q4_K_M format (boyut yarıya iner)
ollama pull llama3.1:8b-instruct-q4_K_M
```

### 2. RAG Entegrasyonu
```python
# vector_store.py
from langchain.vectorstores import Chroma
from langchain.embeddings import OllamaEmbeddings

embeddings = OllamaEmbeddings(model="llama3.1:8b")
vectorstore = Chroma.from_documents(
    documents=ehliyet_docs,
    embedding=embeddings
)
```

### 3. Multi-GPU Setup
```python
# distributed_inference.py
import torch
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "ehliyet-llama",
    device_map="auto",
    torch_dtype=torch.float16
)
```

---

## 🎯 **ROI HESABI (Yatırım Dönüşü)**

### Maliyet Analizi:
- **Hardware**: $1000 (RTX 4080)
- **Elektrik**: $20/ay
- **Bakım**: $0

### Tasarruf:
- **OpenAI API**: $100/ay × 12 = $1200/yıl
- **Break-even**: 10 ay
- **2 yıl sonrası**: %100 tasarruf

---

## ✅ **SONUÇ: MÜKEMMEl PLAN!**

1. **1. Hafta**: Ollama kurulumu + test
2. **2. Hafta**: Fine-tuning + özelleştirme  
3. **3. Hafta**: Production deploy
4. **4. Hafta**: Optimizasyon

**Toplam maliyet**: $1000 hardware
**Yıllık tasarruf**: $1200+
**Bonus**: %90 daha hızlı yanıt!

Bu strateji ile hem maliyet düşer hem de performans artar! 🚀 