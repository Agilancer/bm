param([string]$tag)
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Collections.Generic;
public class VQ {
  [StructLayout(LayoutKind.Sequential)] public struct MBI { public IntPtr BaseAddress; public IntPtr AllocationBase; public uint AllocationProtect; public ushort PartitionId; public IntPtr RegionSize; public uint State; public uint Protect; public uint Type; }
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, int pid);
  [DllImport("kernel32.dll")] public static extern int VirtualQueryEx(IntPtr h, IntPtr addr, out MBI m, uint len);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  public static string Walk(int pid) {
    IntPtr h = OpenProcess(0x0400 | 0x0010, false, pid);
    if (h == IntPtr.Zero) return "cannot open";
    long addr = 0; MBI m; long priv = 0, mapped = 0, image = 0;
    var allocs = new Dictionary<long, long[]>();   // allocation base -> [committed private bytes, type, regions]
    while (VirtualQueryEx(h, new IntPtr(addr), out m, (uint)Marshal.SizeOf(typeof(MBI))) != 0) {
      long size = m.RegionSize.ToInt64();
      if (m.State == 0x1000) {
        if (m.Type == 0x20000) { priv += size; long b = m.AllocationBase.ToInt64(); if (!allocs.ContainsKey(b)) allocs[b] = new long[3]; allocs[b][0] += size; allocs[b][2]++; }
        else if (m.Type == 0x40000) mapped += size; else image += size;
      }
      addr = m.BaseAddress.ToInt64() + size;
      if (addr <= 0) break;
    }
    CloseHandle(h);
    var list = new List<long>(); foreach (var v in allocs.Values) list.Add(v[0]); list.Sort(); list.Reverse();
    long[] edges = { 1L<<30, 256L<<20, 64L<<20, 16L<<20, 4L<<20, 1L<<20, 256L<<10, 0 };
    string[] names = { ">=1G", "256M-1G", "64-256M", "16-64M", "4-16M", "1-4M", "256K-1M", "<256K" };
    long[] sums = new long[8]; int[] counts = new int[8];
    foreach (long s in list) { for (int i = 0; i < 8; i++) if (s >= edges[i]) { sums[i] += s; counts[i]++; break; } }
    string o = "private committed " + (priv >> 20) + " MB, mapped " + (mapped >> 20) + " MB, image " + (image >> 20) + " MB\n by allocation size: ";
    for (int i = 0; i < 8; i++) o += names[i] + ": " + (sums[i] >> 20) + " MB in " + counts[i] + "; ";
    o += "\n biggest (MB): ";
    for (int i = 0; i < Math.Min(24, list.Count); i++) o += (list[i] >> 20) + " ";
    return o;
  }
}
"@
$p = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$tag*" -and $_.CommandLine -match '--type=renderer' } | Sort-Object PrivatePageCount -Descending | Select-Object -First 1
"renderer $($p.ProcessId): $([math]::Round($p.PrivatePageCount/1MB)) MB private"
[VQ]::Walk($p.ProcessId)
