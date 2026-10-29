# EnvIO's monitor loop, run by `sh -s` on an SSH host or in a WSL
# distribution: prints the machine's counters once a second until the
# connection closes. Reads /proc and runs df and nvidia-smi; writes nothing.
# The format is described in src-tauri/src/domain/linux_monitor/mod.rs.
export LC_ALL=C
PATH="$PATH:/usr/local/bin:/usr/bin:/bin:/usr/lib/wsl/lib"

echo @info
cat /proc/sys/kernel/hostname
uname -sr
grep -m1 'model name' /proc/cpuinfo | cut -d: -f2
grep -c '^processor' /proc/cpuinfo
GPU=$(command -v nvidia-smi)

while :; do
  echo @sample
  echo @stat
  grep '^cpu' /proc/stat
  echo @mem
  grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo
  echo @disk
  cat /proc/diskstats
  echo @df
  df -kPT 2>/dev/null | tail -n +2
  if [ -n "$GPU" ]; then
    echo @gpu
    "$GPU" --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed,clocks.gr,uuid --format=csv,noheader,nounits 2>/dev/null
    APPS=$("$GPU" --query-compute-apps=gpu_uuid,pid,used_memory --format=csv,noheader,nounits 2>/dev/null)
    echo @apps
    echo "$APPS"
    PIDS=$(echo "$APPS" | cut -d, -f2 | tr -d ' ' | grep -E '^[0-9]+$' | paste -sd, -)
    if [ -n "$PIDS" ]; then
      echo @ps
      ps -ww -o pid=,user:32=,etimes=,args= -p "$PIDS" 2>/dev/null
    fi
  fi
  echo @end
  sleep 1
done
